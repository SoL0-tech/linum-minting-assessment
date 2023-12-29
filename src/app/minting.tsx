'use client'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { useAccount, useConnect, usePrepareContractWrite, useContractWrite } from 'wagmi'
import { InjectedConnector } from 'wagmi/connectors/injected'
import axios from 'axios'
import styles from './minting.module.css'
import abi from '../abi/mintingContract.abi.json'
import Popup from './components/popup'
import { Metadata } from './types'

export default function Minting() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect({
    connector: new InjectedConnector(),
  })
  
  const mintContractAddress = process.env.NEXT_PUBLIC_MINT_CONTRACT_ADDRESS
  if (!mintContractAddress) {
    alert("No mint contract address found. Please set NEXT_PUBLIC_MINT_CONTRACT_ADDRESS in .env")
  }
  if (mintContractAddress?.slice(0, 2) !== '0x') {
    alert("Invalid mint contract address (not prefixed with '0x'). Please set a valid NEXT_PUBLIC_MINT_CONTRACT_ADDRESS in .env")
  }

  const [metadata, setMetadata] = useState<Metadata>({ name: "", description: "", image: "", 'external_url': "" })
  const [mintFunctionArgs, setMintFunctionArgs] = useState<Array<string>>(['0x0000000000000000000000000000000000000001', ''])
  const { config } = usePrepareContractWrite({
    address: mintContractAddress as `0x${string}`,
    abi,
    functionName: 'mint',
    args: mintFunctionArgs,
    chainId: 5,
  })
  const {
    write: contractWrite,
    data: contractData,
    isLoading: contractIsLoading,
    error: contractError,
  } = useContractWrite(config)

  const [isMinting, setIsMinting] = useState(false)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const handleFileChange = (event: any) => {
    const file = event.target.files[0]
    if (!file) {
      return
    }
    
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validImageTypes.includes(file.type)) {
      alert('Please select an image file (JPEG, PNG, or GIF)');
      return
    }

    setSelectedFile(event.target.files[0]);
  };
  const resetFile = () => {
    setSelectedFile(null)
  }

  const [formData, setFormData] = useState({
    nftTitle: '',
    nftDescription: '',
  });
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const [isSubmitDisabled, setSubmitDisabled] = useState(true);
  useEffect(() => {
    const allFilled = Object.values(formData).every(field => field !== '') && !!selectedFile;
    setSubmitDisabled(!allFilled);
  }, [formData, selectedFile]);

  const mint = async () => {
    if (!selectedFile) {
      return
    }

    const pinataJWT = process.env.NEXT_PUBLIC_PINATA_JWT
    if (!pinataJWT) {
      alert("No Pinata JWT found. Please set NEXT_PUBLIC_PINATA_JWT in .env")
      return
    }

    if (!contractWrite) {
      alert("contractWrite function not defined. Is your wallet provider connected to the Goerli network?")
      return
    }
    
    if (!address) {
      alert("Wallet not connected")
      return
    }

    setIsMinting(true)

    // upload the image to ipfs
    let data = new FormData();
    data.append('file', selectedFile);

    let ipfsHash: string;
    try {
      const response = await axios.post(
        `https://api.pinata.cloud/pinning/pinFileToIPFS`,
        data,
        {
          headers: {
            Authorization: `Bearer ${pinataJWT}`
          }
        })

      ipfsHash = response?.data?.IpfsHash
      if (!ipfsHash) {
        console.error(response)
        throw new Error("Unexpected response")
      }
    } catch (e) {
      console.error(e)
      alert("Failed uploading file to IPFS")
      setIsMinting(false)
      return
    }

    // prepare the metadata
    setMetadata({
      name: formData.nftTitle,
      description: formData.nftDescription,
      image: `https://ipfs.io/ipfs/${ipfsHash}`,
      'external_url': `https://ipfs.io/ipfs/${ipfsHash}`,
    })

    // set the image metadata
    try {
      const response = await axios.put(
        `https://api.pinata.cloud/pinning/hashMetadata`, {
          ipfsPinHash: ipfsHash,
          name: metadata.name,
          keyvalues: metadata,
        }, {
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            Authorization: `Bearer ${pinataJWT}`
          }
        })

      if (response.status !== 200) {
        console.error(response)
        throw new Error("Unexpected response")
      }
    } catch (e) {
      console.error(e)
      alert("Failed setting image metadata")
      setIsMinting(false)
      return
    }

    // call 'mint' on the NFT contract
    setMintFunctionArgs([
      address,
      `https://ipfs.io/ipfs/${ipfsHash}`,
    ])

    try {
      contractWrite();
    } catch (e) {
      console.error(e)
      alert("Failed calling mint function")
      setIsMinting(false)
      return
    }

    setIsMinting(false)
  }

  return (
    <div className={styles.containerContainer}>
      <div className={contractData ? `${styles.container} ${styles.blur}` : styles.container}>
        <nav className={styles.navbar}>
          <h1 className={styles.title}>NFT <span>S<span className={styles.titleSmaller}>EA</span></span></h1>
          <button className={styles.walletButton}>
            <Image src="/bx_wallet.png" width={26} height={26} alt="Wallet icon"></Image>
          </button>
        </nav>
        <main className={styles.main}>
          <div className={styles.headerBox}>
            <h2><span>M</span>INT <span>N</span>EW <span>NFT</span></h2>
            <br></br>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sem tortor quis amet scelerisque vivamus egetas.</p>
          </div>
          <div className={styles.form}>
            {
              !!selectedFile ? (
                <div className={styles.uploadStatus}>
                  <span>
                    {selectedFile.name}
                    <button className={styles.resetFileButton} onClick={resetFile}>&times;</button>
                  </span>
                </div>
              ) : (
                <div className={styles.uploadButtonWrapper}>
                  <button className={styles.uploadButton}>
                    <Image src="/bi_upload.png" alt="Upload Icon" width={14} height={14}></Image>
                    Upload Image
                  </button>
                  <input type="file" name="myfile" accept="image/*" onChange={handleFileChange}/>
                </div>
              )
            }
            <input type="text"
                  name="nftTitle"
                  placeholder="NFT Title"
                  className={styles.textInput}
                  value={formData.nftTitle}
                  onChange={handleInputChange}/>
            <textarea placeholder="Description"
                      name="nftDescription"
                      className={styles.textArea}
                      value={formData.nftDescription}
                      onChange={handleInputChange}></textarea>
            {
              isConnected ? (
                <div className={styles.buttonGroup}>
                  <button className={styles.mintButton} onClick={mint} disabled={isSubmitDisabled || isMinting}>Mint without listing</button>
                  <button className={styles.listButton} onClick={mint} disabled={isSubmitDisabled || isMinting}>Mint and list immediately</button>
                </div>
              ) : (
                <button className={styles.connectWalletButton} onClick={() => connect()}>Connect Wallet</button>
              )
            }
          </div>
        </main>
        <footer className={styles.footer}>
          <p>NFT Sea 2022 © All rights reserved</p>
        </footer>
      </div>
      { !!contractData ? <Popup onClose={() => { window.location.reload() }} data={metadata}/> : null}
    </div>
  )
}