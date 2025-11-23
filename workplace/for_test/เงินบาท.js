function NumberToText(number, lang) {
  if (lang === 'th') {
    return NumberToThaiText(number);
  } else if (lang === 'en') {
    return NumberToEnglishText(number);
  } else {
    return "Invalid language";
  }
}

// ✅ แปลงเลขเป็นภาษาไทย
function NumberToThaiText(number) {
  var bahtText = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  var unit = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

  if (number === 0) return "ศูนย์บาทถ้วน";

  var numStr = number.toString();
  var len = numStr.length;
  var result = "";

  for (var i = 0; i < len; i++) {
    var digit = parseInt(numStr.charAt(i));
    var pos = len - i - 1;

    if (digit !== 0) {
      if (pos === 1 && digit === 1) {
        result += "สิบ";
      } else if (pos === 1 && digit === 2) {
        result += "ยี่สิบ";
      } else if (pos === 0 && digit === 1 && len > 1) {
        result += "เอ็ด";
      } else {
        result += bahtText[digit] + unit[pos];
      }
    }
  }
  return result + "บาทถ้วน";
}

// ✅ แปลงเลขเป็นภาษาอังกฤษ
function NumberToEnglishText(number) {
  if (number === 0) return "Zero Baht Only";

  var ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  var teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  var tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  var thousands = ["", "Thousand", "Million", "Billion"];

  var word = '';
  var numStr = number.toString();
  var num = parseInt(numStr);
  var i = 0;

  while (num > 0) {
    var chunk = num % 1000;
    if (chunk != 0) {
      word = chunkToEnglish(chunk, ones, teens, tens) + " " + thousands[i] + " " + word;
    }
    num = Math.floor(num / 1000);
    i++;
  }

  return word.trim() + " Baht Only";
}

function chunkToEnglish(number, ones, teens, tens) {
  var words = "";
  var hundred = Math.floor(number / 100);
  var remainder = number % 100;

  if (hundred > 0) {
    words += ones[hundred] + " Hundred ";
  }

  if (remainder >= 10 && remainder < 20) {
    words += teens[remainder - 10] + " ";
  } else {
    var ten = Math.floor(remainder / 10);
    var one = remainder % 10;
    if (ten > 0) {
      words += tens[ten] + " ";
    }
    if (one > 0) {
      words += ones[one] + " ";
    }
  }
  return words.trim();
}
