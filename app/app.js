const tokenizerInput = document.getElementById('tokenizer-input');
const tokenizeButton = document.getElementById('tokenize-btn');
const clearButton = document.getElementById('clear-btn');
const tokensDisplay = document.getElementById('tokens-display');

const tokenizeLocal = text => {
  return text.split(/\s+/).filter(Boolean).map(token => ({
    token,
    length: token.length,
    isSpecial: token.startsWith('[') && token.endsWith(']'),
  }));
};

const renderTokens = tokens => {
  if (!tokens.length) {
    tokensDisplay.innerHTML = '<em>No tokens generated.</em>';
    return;
  }

  tokensDisplay.innerHTML = tokens
    .map(({ token }) => {
      let className = 'token';
      if (token.startsWith('[') && token.endsWith(']')) {
        className += ' phase-token';
      } else if (token === '→') {
        className += ' pipeline-operator';
      } else if (['GET', 'POST', 'PUT', 'DELETE'].includes(token)) {
        className += ' http-method';
      }
      return `<span class="${className}">${token}</span>`;
    })
    .join(' ');
};

const tokenizeInput = async () => {
  const text = tokenizerInput.value.trim();

  if (!text) {
    tokensDisplay.innerHTML = '<em>Enter text to tokenize.</em>';
    return;
  }

  try {
    const response = await fetch('/api/tokenize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Tokenizer API unavailable');
    }

    const data = await response.json();
    renderTokens(data.tokens ?? []);
  } catch (error) {
    console.warn('Falling back to local tokenization:', error);
    renderTokens(tokenizeLocal(text));
  }
};

const clearInput = () => {
  tokenizerInput.value = '';
  tokensDisplay.innerHTML = '<em>Cleared.</em>';
};

tokenizeButton.addEventListener('click', tokenizeInput);
clearButton.addEventListener('click', clearInput);

tokenizerInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    tokenizeInput();
  }
});
