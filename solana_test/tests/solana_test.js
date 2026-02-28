const anchor = require("@coral-xyz/anchor");
const { expect } = require("chai");

describe("solana_test", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaTest;

  it("Initializes the poll", async () => {
    const [pollPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("poll")],
      program.programId
    );

    try {
      const tx = await program.methods
        .initializePoll()
        .accounts({
          poll: pollPda,
          signer: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      console.log("Initialization transaction signature", tx);
    } catch (e) {
      console.log("Poll already initialized or error:", e.message);
    }

    const pollAccount = await program.account.poll.fetch(pollPda);
    expect(pollAccount.chatgpt.toNumber()).to.equal(0);
  });

  it("Allows a user to vote for a standard provider", async () => {
    const [pollPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("poll")],
      program.programId
    );

    const [voterPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voter"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    // Delete voter account if it exists (for local testing repeatability)
    // Actually in localnet 'anchor test' it starts fresh so no need.

    const tx = await program.methods
      .vote("ChatGPT")
      .accounts({
        poll: pollPda,
        voter: voterPda,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("Vote transaction signature", tx);

    const pollAccount = await program.account.poll.fetch(pollPda);
    expect(pollAccount.chatgpt.toNumber()).to.equal(1);

    const voterAccount = await program.account.voter.fetch(voterPda);
    expect(voterAccount.hasVoted).to.be.true;
    expect(voterAccount.provider).to.equal("ChatGPT");
  });

  it("Increments 'other' for non-standard providers", async () => {
    // We need a different user to vote again since one vote per user
    const newUser = anchor.web3.Keypair.generate();
    
    // Airdrop some SOL to new user
    const signature = await provider.connection.requestAirdrop(newUser.publicKey, 1000000000);
    await provider.connection.confirmTransaction(signature);

    const [pollPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("poll")],
      program.programId
    );

    const [voterPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voter"), newUser.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .vote("MyAI")
      .accounts({
        poll: pollPda,
        voter: voterPda,
        signer: newUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([newUser])
      .rpc();

    const pollAccount = await program.account.poll.fetch(pollPda);
    expect(pollAccount.other.toNumber()).to.equal(1);

    const voterAccount = await program.account.voter.fetch(voterPda);
    expect(voterAccount.provider).to.equal("MyAI");
  });
}); 
