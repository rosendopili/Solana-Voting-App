# Solana Devnet Setup Plan

This plan outlines the steps to set up a Solana development environment and initialize a starter template on Devnet.

## 1. Environment Audit
Check for existing installations of:
- [ ] Rust (`rustc --version`)
- [ ] Solana CLI (`solana --version`)
- [ ] Anchor CLI (`anchor --version`)

## 2. Tool Installation (Conditional)
If tools are missing, install them in the following order:
- **Rust**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y`
- **Solana CLI**: `sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"` (Update PATH as needed)
- **Anchor**: 
    - Install `avm`: `cargo install --git https://github.com/coral-xyz/anchor avm --locked --force`
    - Install latest Anchor: `avm install latest && avm use latest`

## 3. Devnet Configuration
- [ ] Set cluster: `solana config set --url https://api.devnet.solana.com`
- [ ] Generate Keypair: `solana-keygen new --no-passphrase --outfile ~/.config/solana/id.json` (if missing)
- [ ] Airdrop SOL: `solana airdrop 2`

## 4. Project Initialization
- [ ] Initialize Anchor: `anchor init . --javascript` (or typescript if preferred)
- [ ] Build project: `anchor build`

## 5. Success Criteria
- [ ] `anchor build` completes successfully.
- [ ] Solana config points to devnet.
- [ ] Wallet has a non-zero SOL balance on devnet.
