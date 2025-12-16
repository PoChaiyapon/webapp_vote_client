# Dockerfile
FROM nginx:alpine

# Copy ไฟล์ทั้งหมดไปที่ nginx
COPY . /usr/share/nginx/html

# Copy nginx config (ถ้ามี)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose ports
EXPOSE 80 443

# nginx จะรันอัตโนมัติ