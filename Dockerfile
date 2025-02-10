# Production Dockerfile
FROM python:3.11

ENV DEBIAN_FRONTEND=noninteractive

#COPY .nvmrc .
# $(cat .nvmrc)
RUN curl -sL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
RUN chmod +x ./nodesource_setup.sh && ./nodesource_setup.sh
RUN apt install -y nodejs

RUN pip install aider-chat

ENV user=typedai
ENV homedir=/home/typedai/

RUN useradd --create-home -g users typedai
WORKDIR $homedir

RUN mkdir ".husky"
COPY .husky/install.mjs .husky/install.mjs

COPY package*.json ./
RUN npm ci

COPY . .

# Download the tiktokenizer model, which is written to node_modules/@microsoft/tiktokenizer/model,
# as the root user, as the typedai user can't write to node_modules
RUN npm run initTiktokenizer

USER $user

RUN mkdir .typedai
# Generate the function schemas
RUN npm run functionSchemas

# Needed to avoid the error "fatal: detected dubious ownership in repository at '/home/typedai'" when running git commands
# as the application files are owned by the root user so an agent (which runs as the typedai user) can't modify them.
RUN git config --global --add safe.directory /home/typedai

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD [ "npm", "run", "start" ]
