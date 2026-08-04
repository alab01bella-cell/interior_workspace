const SHEET_NAME = '상담체크리스트_응답';
const DRIVE_FOLDER_NAME = '인테리어_상담체크리스트_첨부파일';

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('인테리어 상담체크리스트')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  const headers = [
    '접수일시',

    '성함',
    '연락처',
    '현장 주소',
    '주거 형태',
    '평수',
    '현재 상태',

    '상담 목적',
    '대면상담 희망일',
    '대면상담 희망 시간',
    '유선안내 가능 요일',
    '유선안내 가능 시간',

    '공사 범위',
    '바꾸고 싶은 공간',
    '교체하고 싶은 항목',
    '유지하고 싶은 항목',
    '꼭 하고 싶은 공사',
    '하지 않아도 되는 공사',

    '생각 중인 예산',
    '예산 기준',
    '입주 예정일',
    '공사 희망 시기',
    '공사 중 거주 여부',
    '일정 관련 특이사항',

    '현재 집에서 가장 불편하거나 개선하고 싶은 부분',
    '특별히 신경 쓰이는 공간',

    '원하는 스타일',
    '선호 색감',
    '피하고 싶은 느낌',

    '거주 인원',
    '아이 여부',
    '반려동물 여부',
    '수납 필요도',
    '요리 빈도',
    '재택근무·작업공간',

    '가장 중요하게 생각하는 부분',
    '우선적으로 개선하고 싶은 공간',
    '예산이 부족하면 줄여도 되는 부분',
    '절대 포기하기 어려운 부분',

    '현장 사진 링크',
    '참고 이미지 링크',
    '참고 링크',
    '참고 자료에서 마음에 드는 부분',
    '참고 자료에서 피하고 싶은 부분',

    '상담 때 꼭 물어보고 싶은 내용',
    '기타 요청사항'
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    if (currentHeaders.length !== headers.length) {
      sheet.clear();
      sheet.appendRow(headers);
    }
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.autoResizeColumns(1, headers.length);

  return true;
}

function submitChecklist(payload) {
  setupSheet();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);

  const data = payload.formData  {};
  const files = payload.files  {};

  const folder = getOrCreateFolder_();

  const sitePhotoUrls = saveFiles_(files.sitePhotos  [], folder, data.name  '고객', '현장사진');
  const referenceImageUrls = saveFiles_(files.referenceImages  [], folder, data.name  '고객', '참고이미지');

  const fullAddress = [data.address  '', data.addressDetail  '']
    .filter(Boolean)
    .join(' ');

  const row = [
    new Date(),

    data.name  '',
    formatPhone_(data.phone  ''),
    fullAddress,
    data.housingType  '',
    data.areaSize  '',
    data.currentStatus  '',

    joinArray_(data.consultPurpose),
    data.visitDate  '',
    data.visitTime  '',
    joinArray_(data.callDays),
    data.callTime  '',

    data.constructionScope  '',
    joinArray_(data.targetSpaces),
    joinArray_(data.replaceItems),
    joinArray_(data.keepItems),
    data.mustDo  '',
    data.skipOk  '',

    formatBudgetCheonman_(data.budget  ''),
    data.budgetType  '',
    data.moveInDate  '',
    data.preferredStart  '',
    data.livingDuringConstruction  '',
    data.scheduleNote  '',

    data.inconvenience  '',
    joinArray_(data.focusSpaces),

    joinArray_(data.styles),
    joinArray_(data.colorTone),
    data.avoidStyle  '',

    data.residents  '',
    data.hasChild  '',
    data.hasPet  '',
    data.storageNeed  '',
    data.cookingFrequency  '',
    data.workSpace  '',

    joinArray_(data.priority),
    joinArray_(data.mustSpaces),
    joinArray_(data.reduceItems),
    data.nonNegotiable  '',

    sitePhotoUrls.join('n'),
    referenceImageUrls.join('n'),
    data.referenceLinks  '',
    data.referenceLike  '',
    data.referenceDislike  '',

    data.questions  '',
    data.etc  ''
  ];

  sheet.appendRow(row);

  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 1, 1, row.length).setVerticalAlignment('top');
  sheet.autoResizeColumns(1, row.length);

  return {
    success true,
    message '상담 체크리스트가 접수되었습니다.'
  };
}

function getOrCreateFolder_() {
  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);

  if (folders.hasNext()) {
    return folders.next();
  }

  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

function saveFiles_(files, folder, customerName, typeLabel) {
  if (!files  files.length === 0) return [];

  const urls = [];

  files.forEach((file, index) = {
    if (!file.base64  !file.mimeType  !file.name) return;

    const bytes = Utilities.base64Decode(file.base64);
    const safeCustomerName = String(customerName).replace([]g, '_');
    const safeFileName = String(file.name).replace([]g, '_');
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');

    const blob = Utilities.newBlob(
      bytes,
      file.mimeType,
      `${timestamp}_${safeCustomerName}_${typeLabel}_${index + 1}_${safeFileName}`
    );

    const driveFile = folder.createFile(blob);
    urls.push(driveFile.getUrl());
  });

  return urls;
}

function joinArray_(value) {
  if (!value) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function formatPhone_(value) {
  const digits = String(value).replace(Dg, '');

  if (digits.length === 11) {
    return digits.replace((d{3})(d{4})(d{4}), '$1-$2-$3');
  }

  if (digits.length === 10) {
    return digits.replace((d{3})(d{3})(d{4}), '$1-$2-$3');
  }

  return value;
}

function formatBudgetCheonman_(value) {
  const digits = String(value).replace(Dg, '');

  if (!digits) return '';

  return `${digits}천만원`;
}