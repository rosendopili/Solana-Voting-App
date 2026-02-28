use anchor_lang::prelude::*;

declare_id!("5QNSKYLeeBdnDULa4DbiPGL6JencHhg1srijGRZq1nwb");

#[program]
pub mod solana_test {
    use super::*;

    pub fn initialize_poll(ctx: Context<InitializePoll>) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        poll.chatgpt = 0;
        poll.gemini = 0;
        poll.claude = 0;
        poll.perplexity = 0;
        poll.deepseek = 0;
        poll.other = 0;
        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, provider: String) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        
        match provider.as_str() {
            "ChatGPT" => poll.chatgpt += 1,
            "Gemini" => poll.gemini += 1,
            "Claude" => poll.claude += 1,
            "Perplexity" => poll.perplexity += 1,
            "DeepSeek" => poll.deepseek += 1,
            _ => poll.other += 1,
        }
        
        let voter = &mut ctx.accounts.voter;
        voter.has_voted = true;
        voter.provider = provider;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePoll<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + 8 * 6, // discriminator + 6 u64 fields
        seeds = [b"poll"],
        bump
    )]
    pub poll: Account<'info, Poll>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(provider: String)]
pub struct Vote<'info> {
    #[account(
        mut,
        seeds = [b"poll"],
        bump
    )]
    pub poll: Account<'info, Poll>,
    #[account(
        init,
        payer = signer,
        space = 8 + 1 + 32, // discriminator + bool + string (max 32 bytes)
        seeds = [b"voter", signer.key().as_ref()],
        bump
    )]
    pub voter: Account<'info, Voter>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Poll {
    pub chatgpt: u64,
    pub gemini: u64,
    pub claude: u64,
    pub perplexity: u64,
    pub deepseek: u64,
    pub other: u64,
}

#[account]
pub struct Voter {
    pub has_voted: bool,
    pub provider: String,
}
