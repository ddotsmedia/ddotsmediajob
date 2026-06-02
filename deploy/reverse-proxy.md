# Routing ddotsmediajobs.com → the app (existing Docker reverse proxy)

The app runs under **PM2 on the host**, listening on `0.0.0.0:3000`.
`setup-vps.sh` is run **without** `SETUP_NGINX` (your Docker proxy owns 80/443).

> ⚠️ A proxy running **inside a Docker container** cannot reach the app via
> `127.0.0.1:3000` — that's the container's own loopback. Target the **host
> gateway** instead:
> - Most Linux Docker hosts: `http://172.17.0.1:3000` (the `docker0` bridge IP).
> - Or add `extra_hosts: ["host.docker.internal:host-gateway"]` to the proxy
>   service and use `http://host.docker.internal:3000`.
> Confirm the gateway with: `ip -4 addr show docker0 | grep inet`

Pick the block matching your proxy.

## A. Plain nginx container (or nginx-proxy)
Add a server block (mounted into the nginx container's conf.d), then reload it:
```nginx
server {
    listen 80;
    server_name ddotsmediajobs.com www.ddotsmediajobs.com;
    location / {
        proxy_pass http://172.17.0.1:3000;   # host gateway, NOT 127.0.0.1
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
# TLS: let your existing certbot/companion issue the cert for the new server_name.
```

## B. Traefik (file provider — dynamic config)
```yaml
http:
  routers:
    ddots:
      rule: "Host(`ddotsmediajobs.com`) || Host(`www.ddotsmediajobs.com`)"
      entryPoints: ["websecure"]
      service: ddots
      tls:
        certResolver: letsencrypt
  services:
    ddots:
      loadBalancer:
        servers:
          - url: "http://172.17.0.1:3000"
```

## C. Caddy
```
ddotsmediajobs.com, www.ddotsmediajobs.com {
    reverse_proxy 172.17.0.1:3000
}
```
Caddy auto-provisions TLS.

## DNS
Point `A` records for `ddotsmediajobs.com` and `www` at the VPS public IP.
TLS issuance (certbot/Traefik/Caddy) only succeeds once DNS resolves to the box.
