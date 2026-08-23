import { describe, it, expect } from 'vitest';
import {
  activeFilterCount,
  hasAnyFilter,
  normalizeFilters,
  toQueryInput,
  toggleValue,
  describeFilters,
  filtersToSearchParams,
  filtersFromSearchParams,
  normalizeEmirateValue,
  STATUS_OPTIONS,
  EMIRATE_OPTIONS,
  type AdminFilters,
} from './admin-filters';

describe('activeFilterCount', () => {
  it('is zero for no filters', () => {
    expect(activeFilterCount({})).toBe(0);
    expect(hasAnyFilter({})).toBe(false);
  });

  it('does not count an empty array as an active filter', () => {
    // A cleared facet leaves [] behind; counting it would show a badge of 1
    // over a list that is not filtered at all.
    expect(activeFilterCount({ status: [], emirate: [] })).toBe(0);
  });

  it('does not count an empty string or false', () => {
    expect(activeFilterCount({ q: '', company: '', salaryDisclosedOnly: false })).toBe(0);
  });

  it('counts salaryMin of 0 — zero is a real bound, not "unset"', () => {
    expect(activeFilterCount({ salaryMin: 0 })).toBe(1);
  });

  it('counts each populated facet once', () => {
    expect(activeFilterCount({ status: ['active'], emirate: ['dubai'], company: 'Emaar' })).toBe(3);
  });
});

describe('normalizeFilters', () => {
  it('strips empty values so the query key stays stable', () => {
    const a = normalizeFilters({ status: [], q: '', emirate: ['dubai'] });
    expect(a).toEqual({ emirate: ['dubai'] });
  });

  it('produces an identical object for equivalent inputs', () => {
    expect(normalizeFilters({ status: [] })).toEqual(normalizeFilters({}));
  });

  it('keeps a zero salary bound', () => {
    expect(normalizeFilters({ salaryMin: 0 })).toEqual({ salaryMin: 0 });
  });
});

describe('toQueryInput', () => {
  it('converts ISO dates to Date objects', () => {
    const out = toQueryInput({ dateFrom: '2024-03-01' });
    expect(out.dateFrom).toBeInstanceOf(Date);
    expect(out.dateFrom?.toISOString().slice(0, 10)).toBe('2024-03-01');
  });

  it('makes the end date inclusive of the whole day', () => {
    // A job posted at 14:00 on the "to" date must still match.
    const out = toQueryInput({ dateTo: '2024-03-31' });
    expect(out.dateTo?.toISOString()).toBe('2024-03-31T23:59:59.999Z');
  });

  it('leaves dates undefined when unset', () => {
    const out = toQueryInput({ q: 'chef' });
    expect(out.dateFrom).toBeUndefined();
    expect(out.dateTo).toBeUndefined();
  });
});

describe('toggleValue', () => {
  it('adds then removes', () => {
    expect(toggleValue<string>(undefined, 'dubai')).toEqual(['dubai']);
    expect(toggleValue(['dubai'], 'dubai')).toEqual([]);
    expect(toggleValue(['dubai'], 'sharjah')).toEqual(['dubai', 'sharjah']);
  });

  it('does not mutate the input', () => {
    const orig = ['dubai'];
    toggleValue(orig, 'sharjah');
    expect(orig).toEqual(['dubai']);
  });
});

describe('facet options', () => {
  it('offers the nine real statuses — no invented "approved" or "live" value', () => {
    const values = STATUS_OPTIONS.map((o) => o.value);
    expect(values).toHaveLength(9);
    expect(values).toContain('active');
    expect(values).not.toContain('approved');
    expect(values).not.toContain('live');
  });

  it('labels active as Live, which is what it means', () => {
    expect(STATUS_OPTIONS.find((o) => o.value === 'active')?.label).toBe('Live');
  });

  it('offers all seven emirates with canonical slugs', () => {
    const slugs = EMIRATE_OPTIONS.map((o) => o.value);
    expect(slugs).toHaveLength(7);
    expect(slugs).toContain('abu-dhabi');
    expect(slugs).toContain('umm-al-quwain');
  });
});

describe('describeFilters', () => {
  it('summarises a salary range as one removable chip', () => {
    const chips = describeFilters({ salaryMin: 5000, salaryMax: 12000 });
    expect(chips).toHaveLength(1);
    expect(chips[0]!.label).toContain('5,000');
    expect(chips[0]!.label).toContain('12,000');
  });

  it('names emirates rather than echoing slugs', () => {
    const chips = describeFilters({ emirate: ['abu-dhabi'] });
    expect(chips[0]!.label).toBe('Emirate: Abu Dhabi');
  });

  it('returns nothing when nothing is applied', () => {
    expect(describeFilters({})).toEqual([]);
  });

  it('produces one chip per active facet', () => {
    const f: AdminFilters = { q: 'chef', status: ['pending'], emirate: ['dubai'], company: 'Emaar' };
    expect(describeFilters(f)).toHaveLength(4);
  });
});

describe('URL synchronisation', () => {
  const round = (f: AdminFilters) => filtersFromSearchParams(filtersToSearchParams(f));

  it('round-trips a full filter set unchanged', () => {
    const f: AdminFilters = {
      q: 'chef',
      status: ['pending', 'active'],
      emirate: ['dubai', 'abu-dhabi'],
      salaryMin: 5000,
      salaryMax: 12000,
      company: 'Emaar',
      dateFrom: '2024-01-01',
      dateTo: '2024-03-31',
      salaryDisclosedOnly: true,
    };
    expect(round(f)).toEqual(f);
  });

  it('produces an empty query string for no filters', () => {
    expect(filtersToSearchParams({}).toString()).toBe('');
    expect(filtersFromSearchParams(new URLSearchParams(''))).toEqual({});
  });

  it('omits empty arrays rather than emitting status=', () => {
    expect(filtersToSearchParams({ status: [], emirate: [] }).toString()).toBe('');
  });

  it('keeps a zero salary bound through the round trip', () => {
    expect(round({ salaryMin: 0 })).toEqual({ salaryMin: 0 });
  });

  it('discards a hand-edited status that is not a real status', () => {
    // ?status=approved would otherwise fail the server's zod enum.
    const f = filtersFromSearchParams(new URLSearchParams('status=approved,live,pending'));
    expect(f.status).toEqual(['pending']);
  });

  it('drops the status key entirely when none survive validation', () => {
    expect(filtersFromSearchParams(new URLSearchParams('status=bogus')).status).toBeUndefined();
  });

  it('discards an unknown emirate slug', () => {
    const f = filtersFromSearchParams(new URLSearchParams('emirate=dubai,atlantis'));
    expect(f.emirate).toEqual(['dubai']);
  });

  it('ignores non-numeric or negative salary bounds', () => {
    expect(filtersFromSearchParams(new URLSearchParams('min=abc')).salaryMin).toBeUndefined();
    expect(filtersFromSearchParams(new URLSearchParams('min=-5')).salaryMin).toBeUndefined();
  });

  it('ignores a malformed date rather than passing it to new Date()', () => {
    expect(filtersFromSearchParams(new URLSearchParams('from=31-03-2024')).dateFrom).toBeUndefined();
    expect(filtersFromSearchParams(new URLSearchParams('from=2024-03-31')).dateFrom).toBe('2024-03-31');
  });

  it('treats any disclosed value other than 1 as unset', () => {
    expect(filtersFromSearchParams(new URLSearchParams('disclosed=1')).salaryDisclosedOnly).toBe(true);
    expect(filtersFromSearchParams(new URLSearchParams('disclosed=0')).salaryDisclosedOnly).toBeUndefined();
  });

  it('parses a pasted URL into filters the server will accept', () => {
    const f = filtersFromSearchParams(new URLSearchParams('q=nurse&status=pending&emirate=dubai&min=4000'));
    expect(f).toEqual({ q: 'nurse', status: ['pending'], emirate: ['dubai'], salaryMin: 4000 });
    expect(toQueryInput(f).status).toEqual(['pending']);
  });
});

describe('emirate casing in the URL', () => {
  it('resolves an uppercase emirate instead of silently dropping it', () => {
    // ?emirate=DUBAI previously parsed to nothing: the list came back
    // unfiltered with no error to explain why.
    expect(filtersFromSearchParams(new URLSearchParams('emirate=DUBAI')).emirate).toEqual(['dubai']);
  });

  it('resolves display names and abbreviations', () => {
    expect(filtersFromSearchParams(new URLSearchParams('emirate=Abu%20Dhabi')).emirate).toEqual(['abu-dhabi']);
    expect(filtersFromSearchParams(new URLSearchParams('emirate=RAK')).emirate).toEqual(['ras-al-khaimah']);
  });

  it('keeps mixed-case lists together and drops only the unknown ones', () => {
    const f = filtersFromSearchParams(new URLSearchParams('emirate=DUBAI,sharjah,Atlantis'));
    expect(f.emirate).toEqual(['dubai', 'sharjah']);
  });

  it('normalizeEmirateValue is re-exported for filter code', () => {
    expect(normalizeEmirateValue(' DUBAI ')).toBe('dubai');
  });

  it('round-trips through the URL in canonical form', () => {
    const parsed = filtersFromSearchParams(new URLSearchParams('emirate=DUBAI'));
    expect(filtersToSearchParams(parsed).get('emirate')).toBe('dubai');
  });
});
