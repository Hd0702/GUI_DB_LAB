FROM node:8
# Create app directory
WORKDIR /app

# Install nodemon for hot reload
RUN npm install -g nodemon
RUN apt-get update -y
RUN apt-get install -y mysql-server
RUN apt-get install -y mysql-client
RUN apt-get install -y default-libmysqlclient-dev
RUN echo yes
VOLUME /var/lib/mysql        #change

RUN mkdir -p /var/run/mysqld   #change
RUN usermod -d /var/lib/mysql/ mysql
RUN find /var/lib/mysql -type f -exec touch {} \;        #change
RUN chown -R mysql:mysql /var/lib/mysql /var/run/mysqld  #change
ADD lab_schema.sql /docker-entrypoint-initdb.d
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY app/package*.json ./
RUN npm install
# Bundle app source
COPY . .

EXPOSE 8080
EXPOSE 3306
FROM mysql:5.7
ADD lab_schema.sql /docker-entrypoint-initdb.d
CMD ["nodemon", "program.js"]