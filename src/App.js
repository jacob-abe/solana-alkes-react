import { useEffect, useState } from 'react'
import { TagCloud } from 'react-tagcloud'
import twitterLogo from './assets/twitter-logo.svg'
import './App.css'
import idl from './utils/idl.json'
import kp from './utils/keypair.json'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { Program, Provider, web3 } from '@project-serum/anchor'

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3

// Create a keypair for the account that will hold the word data.
const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

// Get our program's id form the IDL file.
const programID = new PublicKey(idl.metadata.address)

// Set our network to devent.
const network = clusterApiUrl('devnet')

// Control's how we want to acknowledge when a trasnaction is "done".
const opts = {
  preflightCommitment: 'processed',
}

// Constants
const TWITTER_HANDLE = 'momrider_69'
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`

const colorOptions = {
  luminosity: 'light',
  hue: 'blue',
}

const data = []

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [wordList, setWordList] = useState([])
  const [userList, setUserList] = useState([])

  useEffect(() => {
    window.addEventListener('load', async (event) => {
      await checkIfWalletIsConnected()
    })
  }, [])

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching word list...')
      getWordList()
    }
  }, [walletAddress])

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!')
          const response = await solana.connect({ onlyIfTrusted: true })
          console.log(
            'Connected with Public Key:',
            response.publicKey.toString(),
          )
          setWalletAddress(response.publicKey.toString())
          setWordList(data)
        }
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻')
      }
    } catch (error) {
      console.error(error)
    }
  }

  const connectWallet = async () => {
    const { solana } = window

    if (solana) {
      const response = await solana.connect()
      console.log('Connected with Public Key:', response.publicKey.toString())
      setWalletAddress(response.publicKey.toString())
    }
  }

  const sendWord = async () => {
    if (inputValue.length === 0) {
      console.log('Empty word given!')
      return
    }
    console.log('Word:', inputValue)
    try {
      const provider = getProvider()
      const program = new Program(idl, programID, provider)

      await program.rpc.addWord(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
        },
      })
      console.log('Word sucesfully sent to program', inputValue)

      await getWordList()
    } catch (error) {
      console.log('Error sending GIF:', error)
    }
  }

  const onInputChange = (event) => {
    const { value } = event.target
    setInputValue(value)
  }

  const getWordList = async () => {
    try {
      const provider = getProvider()
      const program = new Program(idl, programID, provider)
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey,
      )

      console.log('Got the account', account)
      let list = []
      let usersList = []
      account.contributerList.map((word) => {
        list.push({ value: word.word, count: 1 })
        if(!usersList.includes(word.userAddress.toString()))
          usersList.push(word.userAddress.toString())
      })
      setWordList(list)
      setUserList(usersList)
    } catch (error) {
      console.log('Error in getWordList: ', error)
      setWordList(null)
      setUserList(null)
    }
  }

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment)
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment,
    )
    return provider
  }

  const createWordAccount = async () => {
    try {
      const provider = getProvider()
      const program = new Program(idl, programID, provider)
      console.log('ping')
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      })
      console.log(
        'Created a new BaseAccount w/ address:',
        baseAccount.publicKey.toString(),
      )
      await getWordList()
    } catch (error) {
      console.log('Error creating BaseAccount account:', error)
    }
  }

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  )

  const renderContributer = () => {
    return (
      <div>
        <h2 style={{ color: 'white' }}>Contributers:</h2>
        <ul>
          {userList.map((user) => (
            <li style={{ color: 'white' }}>{user}</li>
          ))}
        </ul>
      </div>
    )
  }

  const renderWordCloud = () => {
    if (wordList === null) {
      return (
        <div className="connected-container">
          <button
            className="cta-button submit-gif-button"
            onClick={createWordAccount}
          >
            Do One-Time Initialization For Word Program Account
          </button>
        </div>
      )
    }
    // Otherwise, we're good! Account exists. User can submit GIFs.
    else {
      return (
        <div className="connected-container">
          <input
            type="text"
            placeholder="Enter a topic you are into"
            value={inputValue}
            onChange={onInputChange}
          />
          <button className="cta-button submit-gif-button" onClick={sendWord}>
            Submit
          </button>
          <TagCloud
            style={{
              marginLeft: '20%',
              marginRight: '20%',
              marginBottom: '25px',
            }}
            minSize={22}
            maxSize={55}
            colorOptions={colorOptions}
            tags={wordList}
            onClick={(tag) => console.log('clicking on tag:', tag)}
          />
          {userList && userList.length > 0 && renderContributer()}
        </div>
      )
    }
  }

  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">Trending Word cloud</p>
          <p className="sub-text">View trending topics in the metaverse ✨!</p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderWordCloud()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  )
}

export default App
