FROM fedora:41

# Basic dependencies for building .rpm packages and running Electron
RUN dnf install -y \
    curl git jq \
    gcc gcc-c++ make \
    libX11-devel libxkbfile-devel libsecret-devel \
    rpm-build dnf-plugins-core \
    desktop-file-utils xdg-utils \
    sudo which procps-ng \
    && dnf clean all

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
RUN chmod +x /nvm.sh && /nvm.sh 24

# Prepare application directory
WORKDIR /home/appnix/app

RUN . $HOME/.bashrc || true

# Debug: Check Node and NPM versions
RUN node -v && npm -v

# Copy project and fixtures
COPY --chown=appnix:appnix . .
COPY --chown=appnix:appnix tests/docker/config.yml /fixtures/config.yml
COPY --chown=appnix:appnix tests/docker/icons /fixtures/icons

# Install project dependencies
RUN npm install

CMD ["/bin/bash"]
