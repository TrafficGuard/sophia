# Production Dockerfile
FROM python:3.11

ENV DEBIAN_FRONTEND=noninteractive

RUN pip install aider-chat

#COPY .nvmrc .
# $(cat .nvmrc)
RUN curl -sL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
RUN chmod +x ./nodesource_setup.sh && ./nodesource_setup.sh
RUN apt install -y nodejs

ENV user=sophia
ENV homedir=/home/sophia/

RUN useradd --create-home -g users sophia
WORKDIR $homedir

RUN mkdir ".husky"
COPY .husky/install.mjs .husky/install.mjs

COPY package*.json ./
RUN npm ci

COPY . .

# Download the tiktokenizer model, which is written to node_modules/@microsoft/tiktokenizer/model,
# as the root user, as the sophia user can't write to node_modules
RUN npm run initTiktokenizer

USER $user

RUN mkdir .sophia
# Generate the function schemas
RUN npm run functionSchemas

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD [ "npm", "run", "start" ]
