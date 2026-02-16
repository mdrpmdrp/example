function sendCopperFlexMessages() {
  const LINE_TOKEN = "19tSHISQVfgi4VIJYKJyfPUla30PrXS/0vqkiJJ/lk97ksDjGc+Gi4b2edKhJz3pEahVJx3hmxinwMmVhi15Vq9Ni9T9u5zQvmB55WFTtPfnP9MXob85lm167SxPQ/28zffgDk+ZP1VbxzRKCDSkpAdB04t89/1O/w1cDnyilFU=";
  const TARGET_ID = "Ua55431b2d9be5d104c316ccb8ef54e81";
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("LME Cal");
  const data = sheet.getRange("A1:F30").getValues();
  
  const headerTitle = String(data[1][0] || "COPPER Update").trim(); // Row 2
  const updateTime  = data[11][0]? Utilities.formatDate(new Date(data[11][0]), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss") : "Unknown Time"; // Row 12
  const lmePrice    = (data[13][0] || 0).toLocaleString();        // Row 14
  const lmeDiff     = ((data[14][0] || 0)*100).toLocaleString(undefined, { signDisplay: 'always' }); // Row 15
  const exchangeRate = (data[16][0] || 0).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 }); // Row 17

  const summaryFlex = {
    "type": "bubble",
    "header": {
      "type": "box", "layout": "vertical", "backgroundColor": "#073763",
      "contents": [{ "type": "text", "text": headerTitle, "weight": "bold", "color": "#ffffff", "size": "lg" }]
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md",
      "contents": [
        { "type": "text", "text": "🕒 " + updateTime, "size": "xs", "color": "#888888" },
        { "type": "separator" },
        {
          "type": "box", "layout": "horizontal",
          "contents": [
            { "type": "text", "text": "LME PRICE", "flex": 1, "size": "sm", "color": "#555555" },
            { "type": "text", "text": lmePrice, "flex": 1, "align": "end", "weight": "bold" },
            { "type": "text", "text": lmeDiff+ "%", "flex": 1, "align": "end", "color": "#ff0000", "size": "sm" }
          ]
        },
        {
          "type": "box", "layout": "horizontal",
          "contents": [
            { "type": "text", "text": "USD/THB", "flex": 1, "size": "sm", "color": "#555555" },
            { "type": "text", "text": exchangeRate, "flex": 1, "align": "end", "weight": "bold", "color": "#0000FF" },
            { "type": "text", "text": " ", "flex": 1, "align": "end"}
          ]
        }
      ]
    }
  };

 const rows = [];
  // Loop from Row 21 (index 20) to 30
  for (let i = 20; i < 30; i++) {
    let name       = String(data[i][0]).trim(); // Col A
    let pctThai    = data[i][1] ? (data[i][1]*100).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + "%" : "0%"; // Col B
    let priceThai  = (data[i][2] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // Col C
    let pctInter   = data[i][3] ? (data[i][3]*100).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + "%" : "0%"; // Col D
    let priceInter = (data[i][4] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // Col E
    let inventory  = (data[i][5] || 0).toLocaleString(); // Col F

    if (!name || name === "" || name === "undefined") continue;

    // Create a card-like box for each item for better readability
    rows.push({
      "type": "box", "layout": "vertical", "margin": "md", "paddingAll": "md", "backgroundColor": "#f8f9fa", "cornerRadius": "md",
      "contents": [
        // Item Name
        { "type": "text", "text": name, "weight": "bold", "size": "md", "color": "#073763", "wrap": true },
        { "type": "separator", "margin": "sm" },
        // Details Row 1: TH & INT Headers
        {
          "type": "box", "layout": "horizontal", "margin": "sm",
          "contents": [
            { "type": "text", "text": "🇹🇭 ราคาขายในไทย", "size": "xs", "color": "#888888", "flex": 1 },
            { "type": "text", "text": "🌐 ราคาขายต่างประเทศ	", "size": "xs", "color": "#888888", "flex": 1 }
          ]
        },
        // Details Row 2: Prices
        {
          "type": "box", "layout": "horizontal", "margin": "xs",
          "contents": [
            { "type": "text", "text": priceThai, "size": "md", "weight": "bold", "color": "#333333", "flex": 1 },
            { "type": "text", "text": priceInter, "size": "md", "weight": "bold", "color": "#0000FF", "flex": 1 }
          ]
        },
        // Details Row 3: Percentages
        {
          "type": "box", "layout": "horizontal", "margin": "xs",
          "contents": [
            { "type": "text", "text": pctThai, "size": "sm", "color": pctThai.includes('-') ? "#d32f2f" : "#2e7d32", "flex": 1 },
            { "type": "text", "text": pctInter, "size": "sm", "color": pctInter.includes('-') ? "#d32f2f" : "#2e7d32", "flex": 1 }
          ]
        },
        // Inventory
        { "type": "separator", "margin": "sm" },
        {
          "type": "box", "layout": "horizontal", "margin": "sm",
          "contents": [
            { "type": "text", "text": "📦 ตู้คงเหลือ:", "size": "sm", "color": "#666666", "flex": 0 },
            { "type": "text", "text": " " + inventory, "size": "sm", "weight": "bold", "color": "#333333", "flex": 1 }
          ]
        }
      ]
    });
  }

  const tableFlex = {
    "type": "carousel",
    "contents": [
      {
        "type": "bubble", "size": "giga",
        "header": {
          "type": "box", "layout": "vertical", "backgroundColor": "#eeeeee",
           "contents": [{ "type": "text", "text": "📄 Item Details", "weight": "bold", "color": "#333333" }]
        },
        "body": {
          "type": "box", "layout": "vertical", "spacing": "sm",
          "contents": rows
        }
      }
    ]
  };

  // --- SEND BOTH MESSAGES ---
  const payload = {
    "to": TARGET_ID,
    "messages": [
      { "type": "flex", "altText": "Market Summary", "contents": summaryFlex },
      { "type": "flex", "altText": "Price Details", "contents": tableFlex }
    ]
  };

  const options = {
    "method": "post",
    "headers": {
      "Authorization": "Bearer " + LINE_TOKEN,
      "Content-Type": "application/json"
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  const response = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", options);
  Logger.log(response.getContentText());
}