# Tahap 1: Build React App
FROM node:22-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Tahap 2: Serve dengan Nginx (Server Ringan)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Konfigurasi agar routing React jalan (jika di-refresh tidak 404)
RUN echo 'server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]