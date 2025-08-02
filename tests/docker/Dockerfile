FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Basic dependencies
RUN apt-get update && apt-get install -y \
    curl git jq build-essential \
    libx11-dev libxkbfile-dev libsecret-1-dev \
    fakeroot rpm \
    desktop-file-utils xdg-utils \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -ms /bin/bash appnix && \
    echo "appnix ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

COPY --chown=appnix:appnix tests/docker/bash/.bashrc /home/appnix/.bashrc

USER appnix
WORKDIR /home/appnix

# Environment variables for NVM
ENV HOME=/home/appnix
ENV NVM_DIR=$HOME/.nvm
ENV PATH=$HOME/nvm:$PATH

# Copy and run NVM/Node installer (handles symlink and PATH setup internally)
COPY --chown=appnix:appnix tests/docker/scripts/nvm.sh /nvm.sh
RUN chmod +x /nvm.sh && /nvm.sh 22

# Prepare application directory
WORKDIR /home/appnix/app

RUN . $HOME/.bashrc

# Debug: Check Node and NPM versions
RUN node -v && npm -v

# Copy project and fixtures
COPY --chown=appnix:appnix . .
COPY --chown=appnix:appnix tests/docker/config.yml /fixtures/config.yml
COPY --chown=appnix:appnix tests/docker/icons /fixtures/icons

# Install project dependencies
RUN npm install

CMD ["/bin/bash"]

