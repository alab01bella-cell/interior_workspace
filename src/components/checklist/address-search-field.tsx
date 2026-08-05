"use client";

import { useRef, useState } from "react";
import Script from "next/script";
import styles from "./checklist.module.css";

const POSTCODE_SCRIPT_URL = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
const LOAD_ERROR_MESSAGE = "주소 검색 기능을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";

interface AddressSearchFieldProps {
  address: string;
  addressDetail: string;
  onAddressChange: (value: string) => void;
  onAddressDetailChange: (value: string) => void;
  onError: (message: string) => void;
}

export function AddressSearchField({
  address,
  addressDetail,
  onAddressChange,
  onAddressDetailChange,
  onError,
}: AddressSearchFieldProps) {
  const detailInputRef = useRef<HTMLInputElement>(null);
  const [scriptLoadFailed, setScriptLoadFailed] = useState(false);

  const openAddressSearch = () => {
    const Postcode = window.daum?.Postcode;
    if (scriptLoadFailed || !Postcode) {
      onError(LOAD_ERROR_MESSAGE);
      return;
    }

    new Postcode({
      oncomplete: (data) => {
        let selectedAddress = data.roadAddress || data.jibunAddress || "";
        if (data.apartment === "Y" && data.buildingName) {
          selectedAddress += ` (${data.buildingName})`;
        }

        onAddressChange(selectedAddress);
        onError("");
        window.setTimeout(() => detailInputRef.current?.focus());
      },
    }).open();
  };

  return (
    <>
      <Script
        onError={() => {
          setScriptLoadFailed(true);
          onError(LOAD_ERROR_MESSAGE);
        }}
        onLoad={() => setScriptLoadFailed(false)}
        src={POSTCODE_SCRIPT_URL}
        strategy="afterInteractive"
      />
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="addressInput">현장 주소</label>
        <div className={styles.addressRow}>
          <input
            id="addressInput"
            name="address"
            placeholder="주소 검색 버튼을 눌러주세요."
            readOnly
            value={address}
          />
          <button className={styles.addressButton} onClick={openAddressSearch} type="button">주소 검색</button>
        </div>
        <p className={styles.hint}>도로명주소 검색 후 상세주소를 입력해주세요.</p>
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="addressDetailInput">상세주소</label>
        <input
          id="addressDetailInput"
          name="addressDetail"
          onChange={(event) => onAddressDetailChange(event.target.value)}
          placeholder="동/호수, 건물명 등 상세주소"
          ref={detailInputRef}
          value={addressDetail}
        />
      </div>
    </>
  );
}
