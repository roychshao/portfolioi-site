# --- build stage: render the Astro static site with the deployment origin ---
FROM node:22-alpine AS build
ARG SITE=https://example.com
ENV SITE=$SITE
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- runtime stage: unprivileged nginx, listens on 8080 ---
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
