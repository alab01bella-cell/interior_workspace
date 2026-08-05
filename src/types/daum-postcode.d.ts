interface DaumPostcodeData {
  apartment: "Y" | "N";
  buildingName: string;
  jibunAddress: string;
  roadAddress: string;
}

interface DaumPostcodeOptions {
  oncomplete: (data: DaumPostcodeData) => void;
}

interface DaumPostcodeInstance {
  open: () => void;
}

interface DaumPostcodeConstructor {
  new (options: DaumPostcodeOptions): DaumPostcodeInstance;
}

interface Window {
  daum?: {
    Postcode?: DaumPostcodeConstructor;
  };
}
