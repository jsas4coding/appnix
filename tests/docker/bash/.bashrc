# ~/.bashrc for appnix user

# Ensure NVM Node binaries are available
export PATH="$HOME/nvm:$PATH"

# Load NVM if needed
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
fi

# Aliases for convenience
alias ll='ls -lah'
alias gs='git status'

# Prompt customization
PS1='\u@\h:\w$ '
