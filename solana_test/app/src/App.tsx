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
        <h1>AI Provider Voting</h1>
        <WalletMultiButton />
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main>
        <div className="results">
          <h2>Current Standings:</h2>
          {pollData ? (
            <ul>
              <li><span>Gemini</span> <strong>{pollData.gemini?.toString() || "0"}</strong></li>
              <li><span>ChatGPT</span> <strong>{pollData.chatgpt?.toString() || "0"}</strong></li>
              <li><span>Perplexity</span> <strong>{pollData.perplexity?.toString() || "0"}</strong></li>
              <li><span>Claude</span> <strong>{pollData.claude?.toString() || "0"}</strong></li>
              <li><span>DeepSeek</span> <strong>{pollData.deepseek?.toString() || "0"}</strong></li>
              <li><span>Other</span> <strong>{pollData.other?.toString() || "0"}</strong></li>
            </ul>
          ) : (
            <p>Loading results from Devnet...</p>
          )}
        </div>

        {!publicKey ? (
          <div className="cta">
            <p>Connect your wallet to cast your vote!</p>
          </div>
        ) : (
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
    </div>
  )
}

export default App
