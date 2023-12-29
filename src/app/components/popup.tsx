import React from 'react';
import Image from 'next/image'
import styles from './popup.module.css'

const Popup = ({ onClose, data }: { onClose: () => void, data: any }) => {
  return (
    <div className={styles.popup}>
      <div className={styles.popupContent}>
        <Image
          src={data.image}
          alt="NFT"
          width={412}
          height={346}
          layout="responsive" />
        <div className={styles.textContent}>
          <div className={styles.nftName}>
            {data.name}
          </div>
          <div className={styles.nftDescription}>
            {data.description}
          </div>
        </div>
        <button className={styles.continueButton} onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  );
};

export default Popup;