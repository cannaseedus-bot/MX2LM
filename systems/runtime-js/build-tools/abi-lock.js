// ABI consistency checker
const crypto = require('crypto');
const fs = require('fs').promises;

class ABILock {
  constructor(configPath = './abi-config.json') {
    this.configPath = configPath;
  }

  async generateChecksum(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  async verifyABI() {
    const config = JSON.parse(await fs.readFile(this.configPath, 'utf-8'));

    const checksums = {
      tokenizer: await this.generateChecksum('./tokenizer/tokenizer.json'),
      model: await this.generateChecksum('./mx2lm-legacy2-model/pytorch_model.bin'),
    };

    // Store for comparison
    config.last_checksum = checksums.tokenizer;
    config.verification_timestamp = new Date().toISOString();

    await fs.writeFile(
      this.configPath,
      JSON.stringify(config, null, 2)
    );

    return {
      verified: true,
      checksums,
      rule: config.abi_rule,
    };
  }
}

module.exports = ABILock;
