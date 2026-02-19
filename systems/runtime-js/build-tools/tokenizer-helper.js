// Tokenizer utilities for phase-aware processing
class TokenizerHelper {
  constructor() {
    this.phaseTokens = new Set([
      '[Pop]', '[Wo]', "[Ch'en]", '[Yax]', '[Sek]', '[Xul]'
    ]);

    this.pipelineTokens = new Set([
      '[Pop shard_processor]',
      '[Pop hive_collaboration]',
      '[Wo api_request]',
      '[Sek route_to_shard]',
      // ... all other pipeline atoms
    ]);
  }

  // Extract phase tokens from text
  extractPhases(text) {
    const phases = [];
    const regex = /\[(Pop|Wo|Ch'en|Yax|Sek|Xul)\b[^\]]*\]/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      phases.push(match[0]);
    }

    return phases;
  }

  // Validate token sequence
  validateSequence(tokens) {
    const errors = [];

    tokens.forEach((token, index) => {
      // Check for pipeline operator usage
      if (token === '→') {
        if (index === 0 || index === tokens.length - 1) {
          errors.push(`Pipeline operator '→' at invalid position ${index}`);
        }
      }

      // Check phase token consistency
      if (this.phaseTokens.has(token)) {
        // Ensure phase tokens are followed by appropriate content
        if (index < tokens.length - 1) {
          const next = tokens[index + 1];
          if (next && next.startsWith('"@')) {
            // Valid: phase token followed by structural anchor
          } else if (!this.pipelineTokens.has(next)) {
            // Warning but not error
            console.warn(`Phase token ${token} may not be properly utilized`);
          }
        }
      }
    });

    return errors;
  }

  // Generate token visualization
  visualizeTokens(tokens) {
    return tokens
      .map(token => {
        let className = 'token';

        if (this.phaseTokens.has(token)) {
          className += ' phase-token';
        } else if (this.pipelineTokens.has(token)) {
          className += ' pipeline-token';
        } else if (token === '→') {
          className += ' pipeline-operator';
        } else if (token.startsWith('"@')) {
          className += ' structural-anchor';
        } else if (['GET', 'POST', 'PUT', 'DELETE'].includes(token)) {
          className += ' http-method';
        }

        return `<span class="${className}">${this.escapeHtml(token)}</span>`;
      })
      .join(' ');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

module.exports = TokenizerHelper;
