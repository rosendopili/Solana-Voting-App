import { useState, useEffect, useMemo } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Program, AnchorProvider, web3, utils } from '@coral-xyz/anchor'
import idl from './assets/idl.json'
import './App.css'

const PROGRAM_ID = new web3.PublicKey("5QNSKYLeeBdnDULa4DbiPGL6JencHhg1srijGRZq1nwb")

const PROVIDERS = ["Gemini", "ChatGPT", "Perplexity", "Claude", "DeepSeek"]

function App() {
  const { connection } = useConnection()
  const { publicKey, wallet } = useWallet()
  const [pollData, setPollData] = useState<any>(null)
  const [votedProvider, setVotedProvider] = useState<string | null>(null)
  const [otherProvider, setOtherProvider] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Program instance for fetching (doesn't require a wallet)
  const readOnlyProgram = useMemo(() => {
    // @ts-ignore
    const provider = new AnchorProvider(connection, { publicKey: web3.Keypair.generate().publicKey }, AnchorProvider.defaultOptions())
    // @ts-ignore
    return new Program(idl, provider)
  }, [connection])

  // Program instance for voting (requires a wallet)
  const walletProgram = useMemo(() => {
    if (!wallet || !wallet.adapter) return null
    try {
      // @ts-ignore
      const provider = new AnchorProvider(connection, wallet.adapter, AnchorProvider.defaultOptions())
      // @ts-ignore
      return new Program(idl, provider)
    } catch (e) {
      return null
    }
  }, [connection, wallet])

  const fetchPollData = async () => {
    try {
      setError(null)
      const [pollPda] = web3.PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("poll")],
        PROGRAM_ID
      )
      
      // @ts-ignore
      const data = await readOnlyProgram.account.poll.fetch(pollPda)
      setPollData(data)

      if (publicKey) {
        const [voterPda] = web3.PublicKey.findProgramAddressSync(
          [utils.bytes.utf8.encode("voter"), publicKey.toBuffer()],
          PROGRAM_ID
        )
        try {
          // @ts-ignore
          const voterData = await readOnlyProgram.account.voter.fetch(voterPda)
          // @ts-ignore
          setVotedProvider(voterData.provider)
        } catch (e) {
          setVotedProvider(null)
        }
      }
    } catch (e: any) {
      console.error("Error fetching poll data:", e)
      if (e.message.includes("Account does not exist") || e.message.includes("not found")) {
        setError("Poll not yet initialized on-chain.")
      } else {
        setError("Error connecting to Solana: " + e.message)
      }
    }
  }

  useEffect(() => {
    fetchPollData()
    // Optional: poll for updates every 10 seconds
    const interval = setInterval(fetchPollData, 10000)
    return () => clearInterval(interval)
  }, [readOnlyProgram, publicKey])

  const handleVote = async (choice: string) => {
    if (!walletProgram || !publicKey) return
    setLoading(true)
    try {
      const [pollPda] = web3.PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("poll")],
        PROGRAM_ID
      )
      const [voterPda] = web3.PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("voter"), publicKey.toBuffer()],
        PROGRAM_ID
      )

      // @ts-ignore
      await walletProgram.methods
        .vote(choice)
        .accounts({
          poll: pollPda,
          voter: voterPda,
          signer: publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc()

      await fetchPollData()
      alert("Vote cast successfully!")
    } catch (e: any) {
      console.error("Voting error:", e)
      alert("Error casting vote: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="App">
      <header>
        <h1>Proof of Preference</h1>
        <p className="subtitle">Vote for your favorite AI provider using the power of blockchain.</p>
      </header>

      <section className="instructions">
        <h3>Instructions:</h3>
        <ol>
          <li>Connect your Solana Wallet to get started.</li>
          <li>If you don't have a wallet, <a href="https://phantom.com/learn/guides/how-to-create-new-wallet" target="_blank" rel="noopener noreferrer">sign up for one</a>.</li>
          <li>Cast a vote for your favorite AI provider.</li>
        </ol>
      </section>

      <div className="wallet-actions">
        <WalletMultiButton />
        <a 
          href="https://phantom.com/learn/guides/how-to-create-a-new-wallet" 
          target="_blank" 
          rel="noopener noreferrer"
          className="create-wallet-link-standalone"
        >
          <button className="create-wallet-btn">Create New Wallet</button>
        </a>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <main>
        <div className="results">
          <h2>Current Standings:</h2>
          {pollData ? (
            <>
              <ul>
                {[
                  { name: "Gemini", count: pollData.gemini },
                  { name: "ChatGPT", count: pollData.chatgpt },
                  { name: "Perplexity", count: pollData.perplexity },
                  { name: "Claude", count: pollData.claude },
                  { name: "DeepSeek", count: pollData.deepseek },
                  { name: "Other", count: pollData.other },
                ].map((item) => {
                  const totalVotes = 
                    (pollData.gemini?.toNumber() || 0) +
                    (pollData.chatgpt?.toNumber() || 0) +
                    (pollData.perplexity?.toNumber() || 0) +
                    (pollData.claude?.toNumber() || 0) +
                    (pollData.deepseek?.toNumber() || 0) +
                    (pollData.other?.toNumber() || 0);
                  
                  const count = item.count?.toNumber() || 0;
                  const percentage = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : "0.0";

                  return (
                    <li key={item.name}>
                      <div className="bar-label">
                        <span>{item.name}</span>
                        <strong>{percentage}%</strong>
                      </div>
                      <div className="bar-container">
                        <div className="bar-fill" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="total-votes">
                Total Votes: <strong>{
                  ((pollData.gemini?.toNumber() || 0) +
                  (pollData.chatgpt?.toNumber() || 0) +
                  (pollData.perplexity?.toNumber() || 0) +
                  (pollData.claude?.toNumber() || 0) +
                  (pollData.deepseek?.toNumber() || 0) +
                  (pollData.other?.toNumber() || 0)).toString()
                }</strong>
              </div>
            </>
          ) : (
            <p>Loading results from Devnet...</p>
          )}
        </div>

        {!publicKey ? null : (
          <>
            {votedProvider ? (
              <div className="voted-status">
                <h2>Thanks for voting!</h2>
                <p>You voted for: <strong>{votedProvider}</strong></p>
              </div>
            ) : (
              <div className="voting-section">
                <h2>Cast Your Vote:</h2>
                <div className="button-grid">
                  {PROVIDERS.map((p) => (
                    <button key={p} onClick={() => handleVote(p)} disabled={loading}>
                      {p}
                    </button>
                  ))}
                </div>
                <div className="other-vote">
                  <input
                    type="text"
                    placeholder="Other AI Provider"
                    value={otherProvider}
                    onChange={(e) => setOtherProvider(e.target.value)}
                  />
                  <button 
                    onClick={() => handleVote(otherProvider)} 
                    disabled={loading || !otherProvider.trim()}
                  >
                    Vote Other
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <footer className="powered-by">
        <a href="https://mlh.link/solana" target="_blank" rel="noopener noreferrer">
          Powered by Solana
        </a>
      </footer>
    </div>
  )
}

export default App
