main();
function main() {
  document.getElementById("back").style.display = "none";
  document.getElementById("login").style.display = "none";
  document.getElementById("customFlex").style.display = "none";
  document.getElementById("templateFlex").style.display = "block";
  document.getElementById("img").style.display = "none";
  document.getElementById("uploadSection").style.display = "none";
  document.getElementById("inputSection").style.display = "block";
  document.getElementById("uploadSection").style.display = "none";
  document.getElementById("body").style.display = "none";

  initializeLiff();
}

async function initializeLiff() {
  await liff.init({
    liffId: "1655873446-w6lGyybq"
  });
  liff.ready.then(() => {
    if (!liff.isLoggedIn()) {
      liff.login();
    }

    document.getElementById("body").style.display = "block";
    initializeApp();

  });
}

function shared(url, header, msg, img, type) {
  let filename = new URL(img);
  let params = filename.searchParams;
  let token = params.get("token");
  let liffurl = "https://liff.line.me/1655200505-or54PK6a";
  let flex = {
    type: "flex",
    altText: "shared",
    contents: {
      type: "bubble",
      size: "giga",
      body: {
        type: "box",
        layout: "vertical",
        contents: []
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "link",
            height: "sm",
            action: {
              type: "uri",
              label: "แชร์",
              uri: `${liffurl}?url=${url}&msg=${encodeURI(
                msg
              )}&img=${img}&header=${encodeURI(header)}`
            }
          }
        ],
        flex: 0
      }
    }
  };
  if ((msg != null) & (msg.length > 0)) {
    flex.contents.body.contents.push({
      type: "text",
      text: msg,
      wrap: true
    });
  }
  if ((header != null) & (header.length > 0)) {
    flex.contents.body.contents.unshift({
      type: "text",
      text: header,
      weight: "bold",
      size: "lg",
      wrap: true
    });
  }
  if (img != null && img.length > 0) {
    flex.contents.hero = {
      type: "image",
      url: img,
      size: "full",
      aspectRatio: "150:196",
      aspectMode: "cover"
    };
  }
  if (url != null && url.length > 0) {
    flex.contents.footer.contents.push({
      type: "button",
      style: "link",
      height: "sm",
      action: {
        type: "uri",
        label: "เข้าชม",
        uri: url
      }
    },
      {
        type: "spacer",
        size: "sm"
      })
  } else {
    flex.contents.footer.contents.push(
      {
        type: "spacer",
        size: "sm"
      })
  }
  // prompt("test", JSON.stringify(flex));
  if (type == "share") {
    liff
      .shareTargetPicker([flex])
      .then(res => {
        liff.closeWindow();
      })
      .catch(err => alert("catch: " + err));
  } else if (type == "send") {
    liff
      .sendMessages([flex])
      .then(() => {
        liff.closeWindow();
      })
      .catch(err => alert(err));
  }
}
function initializeApp() {
  if (!liff.isInClient()) {
    document.getElementById("sendMessageButton").style.display = "none";
  }
  registerButtonHandlers();
}

function registerButtonHandlers() {
  if (!liff.isLoggedIn()) {
    document.getElementById("login").style.display = "block";
    document.getElementById("scanbutton").style.display = "none";
    document.getElementById("radioGroup").style.display = "none";
    document.getElementById("liffBody").style.display = "none";
    document.getElementById("uploadImg").style.display = "none";
  }
}
// openWindow call
// sendMessages call
async function shareClick(imageurl) {
  let flex = document.getElementById("flexBox").value;
  let json;
  let message;
  if (
    document.getElementById("customFlex").style.display == "none" &&
    document.getElementById("templateFlex").style.display == "block"
  ) {
    let imageUrl = document.getElementById("imageLink").value;
    console.log(imageUrl)
    let fileType = "";
    if (imageUrl != "")
      fileType = getFilename(document.getElementById("imageLink").value).split(
        "."
      )[1];
    let headingMessage = document.getElementById("headingMessage").value;
    let bodyMessage = document.getElementById("bodyMessage").value;
    let link = document.getElementById("linkUrl").value;
    let altMessage = headingMessage == "" ? bodyMessage : headingMessage;
    if (document.getElementById("canShared").checked == true) {
      return shared(link, headingMessage, bodyMessage, imageUrl, "share");
    } else {
      if (headingMessage == "" && bodyMessage == "") {
        alert('คุณต้องกรอก "ข้อความ" อย่างน้อย 1 ช่อง');
      } else {
        if (fileType == "gif") {
          if (headingMessage != "" && bodyMessage == "") {
            bodyMessage = headingMessage;
            headingMessage = "";
          }
          message = {
            type: "template",
            altText: "this is a buttons template",
            template: {
              type: "buttons",
              imageSize: "contain",
              imageAspectRatio: "square",
              actions: [
                {
                  type: "uri",
                  label: "Link",
                  uri: "https://www.google.com"
                }
              ],
              thumbnailImageUrl: imageUrl,
              text: bodyMessage
            }
          };
          if (headingMessage != "") message.template.title = headingMessage;
          if (link != "") message.template.actions[0].uri = link;
        } else {
          let json = {
            type: "bubble",
            size: "giga",
            body: {
              type: "box",
              layout: "vertical"
            }
          };
          let hero;
          if (imageUrl != "") {
            hero = {
              type: "image",
              url: imageUrl,
              size: "full",
              aspectRatio: "1:1",
              aspectMode: "cover"
            };
            json.hero = hero;
          }
          let footer;
          if (link != "") {
            footer = {
              type: "box",
              layout: "vertical",
              spacing: "sm",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  height: "md",
                  action: {
                    type: "uri",
                    label: "LINK",
                    uri: link
                  }
                },
                {
                  type: "spacer",
                  size: "sm"
                }
              ],
              flex: 0
            };
            json.footer = footer;
          }
          var bodyContent = [];
          if (headingMessage != "") {
            bodyContent.push({
              type: "text",
              text: headingMessage,
              weight: "bold",
              size: "xl",
              wrap: true
            });
          }
          if (bodyMessage != "") {
            bodyContent.push({
              type: "text",
              text: bodyMessage,
              size: "lg",
              wrap: true
            });
          }
          json.body.contents = bodyContent;
          message = {
            type: "flex",
            altText: altMessage,
            contents: json
          };
        }
        liff.ready.then(() => {
          if (!liff.isInClient()) {
            if (!liff.isLoggedIn()) {
              // set `redirectUri` to redirect the user to a URL other than the front page of your LIFF app.
              liff.login();
            } else {
              if (liff.isApiAvailable("shareTargetPicker")) {
                liff.shareTargetPicker([message]);
              }
            }
          } else {
            if (liff.isApiAvailable("shareTargetPicker")) {
              liff.shareTargetPicker([message]);
            }
          }
        });
      }
    }
  } else if (
    document.getElementById("customFlex").style.display == "block" &&
    document.getElementById("templateFlex").style.display == "none"
  ) {
    if (flex == "") {
      alert("กรุณาใส่ Flex หรือข้อความที่ต้องการ ในกล่องข้อความ");
    } else {
      try {
        json = JSON.parse(flex);
        message = {
          type: "flex",
          altText: "send from LIFF",
          contents: json
        };
      } catch (e) {
        json = flex;
        message = {
          type: "text",
          text: json
        };
      }
      liff.ready.then(() => {
        if (!liff.isInClient()) {
          if (!liff.isLoggedIn()) {
            // set `redirectUri` to redirect the user to a URL other than the front page of your LIFF app.
            liff.login();
          } else {
            if (liff.isApiAvailable("shareTargetPicker")) {
              liff.shareTargetPicker([message]);
            }
          }
        } else {
          if (liff.isApiAvailable("shareTargetPicker")) {
            liff.shareTargetPicker([message]);
          }
        }
      });
    }
  }
  // json = json.replace(/\t/g, "")
  //json = json.replace(/\"/g, '"')
}

async function sendClick() {
  let flex = document.getElementById("flexBox").value;
  let json;
  let message;
  if (
    document.getElementById("customFlex").style.display == "none" &&
    document.getElementById("templateFlex").style.display == "block"
  ) {
    let imageUrl = document.getElementById("imageLink").value;
    let fileType = "";
    if (imageUrl != "")
      fileType = getFilename(document.getElementById("imageLink").value).split(
        "."
      )[1];
    let headingMessage = document.getElementById("headingMessage").value;
    let bodyMessage = document.getElementById("bodyMessage").value;
    let link = document.getElementById("linkUrl").value;
    let altMessage = headingMessage == "" ? bodyMessage : headingMessage;
    if (document.getElementById("canShared").checked == true) {
      return shared(link, headingMessage, bodyMessage, imageUrl, "send");
    } else {
      if (headingMessage == "" && bodyMessage == "") {
        alert('คุณต้องกรอก "ข้อความ" อย่างน้อย 1 ช่อง');
      } else {
        if (fileType == "gif") {
          if (headingMessage != "" && bodyMessage == "") {
            bodyMessage = headingMessage;
            headingMessage = "";
          }
          if (bodyMessage.length <= 60 && headingMessage.length <= 40) {
            message = {
              type: "template",
              altText: "this is a buttons template",
              template: {
                type: "buttons",
                imageSize: "contain",
                imageAspectRatio: "square",
                actions: [
                  {
                    type: "uri",
                    label: "Link",
                    uri: "https://www.google.com"
                  }
                ],
                thumbnailImageUrl: imageUrl,
                text: bodyMessage
              }
            };
            if (headingMessage != "") message.template.title = headingMessage;
            if (link != "") message.template.actions[0].uri = link;
          }
        } else {
          let json = {
            type: "bubble",
            size: "giga",
            body: {
              type: "box",
              layout: "vertical"
            }
          };
          let hero;
          if (imageUrl != "") {
            hero = {
              type: "image",
              url: imageUrl,
              size: "full",
              aspectRatio: "1:1",
              aspectMode: "cover"
            };
            json.hero = hero;
          }
          let footer;
          if (link != "") {
            footer = {
              type: "box",
              layout: "vertical",
              spacing: "sm",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  height: "md",
                  action: {
                    type: "uri",
                    label: "LINK",
                    uri: link
                  }
                },
                {
                  type: "spacer",
                  size: "sm"
                }
              ],
              flex: 0
            };
            json.footer = footer;
          }
          var bodyContent = [];
          if (headingMessage != "") {
            bodyContent.push({
              type: "text",
              text: headingMessage,
              weight: "bold",
              size: "xl",
              wrap: true
            });
          }
          if (bodyMessage != "") {
            bodyContent.push({
              type: "text",
              text: bodyMessage,
              size: "lg",
              wrap: true
            });
          }
          json.body.contents = bodyContent;
          message = {
            type: "flex",
            altText: altMessage,
            contents: json
          };
        }
        liff.ready.then(() => {
          if (!liff.isLoggedIn()) {
            // set `redirectUri` to redirect the user to a URL other than the front page of your LIFF app.
            liff.login();
          } else {
            liff
              .sendMessages([message])
              .then(() => {
                liff.closeWindow();
              })
              .catch(err => {
                if (fileType == "gif") {
                  alert(
                    "หัวข้อต้องไม่เกิน 40 ตัวอักษร และเนื้อหาต้องไม่เกิน 60 ตัวอักษรครับ\n\nกรุณาตรวจสอบอีกครั้ง"
                  );
                } else {
                  alert(err);
                }
              });
          }
        });
      }
    }
  } else if (
    document.getElementById("customFlex").style.display == "block" &&
    document.getElementById("templateFlex").style.display == "none"
  ) {
    if (flex == "") {
      alert("กรุณาใส่ Flex หรือข้อความที่ต้องการ ในกล่องข้อความ");
    } else {
      try {
        json = JSON.parse(flex);
        message = {
          type: "flex",
          altText: "send from LIFF",
          contents: json
        };
      } catch (e) {
        json = flex;
        message = {
          type: "text",
          text: json
        };
      }
      liff.ready.then(() => {
        if (!liff.isLoggedIn()) {
          // set `redirectUri` to redirect the user to a URL other than the front page of your LIFF app.
          liff.login();
        } else {
          liff
            .sendMessages([message])
            .then(() => {
              liff.closeWindow();
            })
            .catch(err => {
              alert(err);
            });
        }
      });
    }
  }
  // json = json.replace(/\t/g, "")
  //json = json.replace(/\"/g, '"')
}
/**
 * Alert the user if LIFF is opened in an external browser and unavailable buttons are tapped
 */
function sendAlertIfNotInClient() {
  alert(
    "This button is unavailable as LIFF is currently being opened in an external browser."
  );
}
async function sendTemplatFlex(number) {
  let headingMessage = "";
  let bodyMessage = "";
  let link = "";
  let method;
  altText = "";
  let flex;
  switch (number) {
    case 1:
      altText = "รายชื่อห้องแชทหัวข้อต่างๆ";
      flex = {
        type: "bubble",
        size: "giga",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "separator"
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "image",
                      url:
                        "https://firebasestorage.googleapis.com/v0/b/neno-kspoau.appspot.com/o/personal%2Flogo%20teams.png?alt=media&token=f754fe69-f67b-4dae-999d-aa0fac3003c4",
                      aspectMode: "fit",
                      size: "full"
                    }
                  ],
                  width: "72px",
                  height: "72px"
                },
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      contents: [
                        {
                          type: "span",
                          text: "ครูอภิวัฒน์ สอนสร้างสื่อ",
                          weight: "bold",
                          color: "#000000"
                        }
                      ],
                      wrap: true,
                      size: "xl"
                    },
                    {
                      type: "text",
                      text: "โปรดเลือกหัวข้อ ในการเรียนรู้"
                    },
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "button",
                          action: {
                            type: "uri",
                            label: "1. ห้องกลาง(พูดคุย/สนทนาทั่วไป)",
                            uri:
                              "https://line.me/ti/g2/_heMj6gkbXYM_5P_TclHmw?utm_source=invitation&utm_medium=link_copy&utm_campaign=default"
                          },
                          style: "primary",
                          color: "#CCCC00",
                          margin: "md"
                        },
                        {
                          type: "button",
                          action: {
                            type: "uri",
                            label: "2. Web App",
                            uri:
                              "https://line.me/ti/g2/W-zn06X8WmxA6utXqdjK5Q?utm_source=invitation&utm_medium=link_copy&utm_campaign=default"
                          },
                          style: "primary",
                          color: "#CD853F",
                          margin: "md"
                        },
                        {
                          type: "button",
                          action: {
                            type: "uri",
                            label: "3. Google Apps",
                            uri:
                              "https://line.me/ti/g2/6Svp_RpkkePzKQXhBMJKkw?utm_source=invitation&utm_medium=link_copy&utm_campaign=default"
                          },
                          style: "primary",
                          color: "#7B68EE",
                          margin: "md"
                        },
                        {
                          type: "button",
                          action: {
                            type: "uri",
                            label: "4. Consult Project",
                            uri:
                              "https://line.me/ti/g2/pAp5kK3VR-d0Sb1b7870uQ?utm_source=invitation&utm_medium=link_copy&utm_campaign=default"
                          },
                          style: "primary",
                          color: "#663399",
                          margin: "md"
                        },
                        {
                          type: "button",
                          action: {
                            type: "uri",
                            label: "5. สื่อการเรียนการสอน",
                            uri:
                              "https://line.me/ti/g2/HCZR84AWzCtQx0YBWJPsDA?utm_source=invitation&utm_medium=link_copy&utm_campaign=default"
                          },
                          style: "primary",
                          color: "#B03060",
                          margin: "md"
                        },
                        {
                          type: "button",
                          action: {
                            type: "uri",
                            label: "6. LINE Learning",
                            uri:
                              "https://line.me/ti/g2/xcxsfT-abehP9cg6mM6IQA?utm_source=invitation&utm_medium=link_copy&utm_campaign=default"
                          },
                          style: "primary",
                          margin: "md"
                        }
                      ],
                      spacing: "md",
                      margin: "md"
                    }
                  ]
                }
              ],
              spacing: "xl",
              paddingAll: "20px"
            }
          ],
          paddingAll: "0px"
        }
      };
      break;
    case 2:
      altText = "คำตอบพร้อมลิ้งค์";
      headingMessage = prompt("หัวข้อ", "");
      bodyMessage = prompt("เนื้อหา", "");
      link = prompt("ลิ้งค์", "");
      var bodyContent = [];
      if (headingMessage != "") {
        bodyContent.push({
          type: "text",
          text: headingMessage,
          weight: "bold",
          size: "xl",
          wrap: true
        });
      }
      if (bodyMessage != "") {
        bodyContent.push({
          type: "text",
          text: bodyMessage,
          size: "lg",
          wrap: true
        });
      }
      flex = {
        type: "bubble",
        hero: {
          type: "image",
          url:
            "https://s3-ap-southeast-1.amazonaws.com/img-in-th/19bac68596956eeafa906023863f6826.png",
          size: "full",
          aspectRatio: "20:13",
          aspectMode: "cover"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: bodyContent
        }
      };
      break;
    case 3:
      altText = "Youtube Link";
      link = prompt("ลิ้งค์ Youtube", "");
      let thumpnail;
      let title;
      let description;
      let data = await getYoutubeData(link);
      if (data == null)
        return alert(
          "ไม่สามารถรับข้อมูลจาก youtube ได้ ให้สงเป็นลิงค์ธรรมดาแทนนะครับ"
        );
      flex = {
        type: "bubble",
        hero: {
          type: "image",
          url: data[0],
          size: "full",
          aspectRatio: "2:1.1",
          aspectMode: "cover"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "spacer"
            },
            {
              type: "text",
              text: data[1],
              weight: "bold",
              wrap: true
            },
            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: data[2],
                  wrap: true,
                  size: "sm",
                  maxLines: 5
                }
              ]
            }
          ],
          paddingAll: "3%"
        }
      };
      break;
    case 4:
      altText = "ประชาสัมพันธ์ E-book";
      flex = {
        type: "carousel",
        contents: [
          {
            type: "bubble",
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: "text",
                  wrap: true,
                  contents: [
                    {
                      type: "span",
                      text: "🗣️🗣️เมื่อมีคนเรียกร้องมา เราก็จัดให้",
                      size: "lg",
                      weight: "bold",
                      color: "#0000ff"
                    },
                    {
                      type: "span",
                      text:
                        "\n\n💥E-book สอนเรื่องการสร้าง Bot เช็คตารางเรียน แบบ step-by-step ที่เปิดขายใน Line my shop ได้รับความสนใจอย่างมาก\n\n💥สิทธิสำหรับคนที่สั่งซื้อ จะสามารถสอบถามเรื่องการทำกับผู้เขียนบทความได้โดยตรง\n💥หากท่านอยากลองทดสอบสามารถแอดไลน์บอทตัวอย่างไปทดสอบได้\n💥สนใจอยากเรียนรู้ สามารถกดปุ่มรายละเอียดิเข้าไปสั่งซื้อได้เลยครับ"
                    },
                    {
                      type: "span",
                      text: "\n\n🔥🔥🔥มีคนเรียกร้อง🔥🔥🔥 ",
                      size: "lg",
                      color: "#ff0000"
                    },
                    {
                      type: "span",
                      text:
                        "\nเราจึงขยายเวลาโปรโมชันออกไปถึง 30/06/63 ลดราคาจาก 1,990 เหลือเพียง 1500 บาทเท่านั้นครับ รีบสั่งกันด่วนๆเลยนะครับ"
                    }
                  ]
                },
                {
                  type: "filler"
                },
                {
                  type: "filler"
                }
              ]
            }
          },
          {
            type: "bubble",
            hero: {
              type: "image",
              url: "https://i.ytimg.com/vi/ch1ZQWkdWV0/hqdefault.jpg",
              size: "full",
              aspectRatio: "2:1.1",
              aspectMode: "cover"
            },
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "spacer"
                },
                {
                  type: "text",
                  text: "E-Book เรียนรู้การสร้างบอทไม่ใช่เรื่องยาก",
                  weight: "bold",
                  wrap: true
                },
                {
                  type: "box",
                  layout: "vertical",
                  margin: "lg",
                  spacing: "sm",
                  contents: [
                    {
                      type: "text",
                      text:
                        'คลิกดูรายละเอียดเพื่อตัดสินใจเป็นเจ้าของอีบุ๊กดีๆแบบนี้ได้แล้วที่\nhttps://shop.line.me/@671btyoe\n========================\n✅ ลิ้งค์เข้ากลุ่ม  "ห้องกลาง(พูดคุย/สนทนาทั่วไป)" \nhttps://line.me/ti/g2/_heMj6gkbXYM_5P_TclHmw?utm_source=invitation&utm_medium=link_copy&utm_campaign=default\n✅ ลิ้งค์เข้ากลุ่ม  "สื่อการเรียนการสอน"\nhttps://line.me/ti/g2/HCZR84AWzCtQx0YBWJPsDA?utm_source=invitation&utm_medium=link_copy&utm_campaign=default\n✅ ลิ้งค์เข้ากลุ่ม "Line Learning"\nhttps://line.me/ti/g2/xcxsfT-abehP9cg6mM6IQA?utm_source=invitation&utm_medium=link_copy&utm_campaign=default\n✅ ลิ้งค์เข้ากลุ่ม  "Web App"\nhttps://line.me/ti/g2/W-zn06X8WmxA6utXqdjK5Q?utm_source=invitation&utm_medium=link_copy&utm_campaign=default\n✅ ลิ้งค์เข้ากลุ่ม "Google Apps"\nhttps://line.me/ti/g2/6Svp_RpkkePzKQXhBMJKkw?utm_source=invitation&utm_medium=link_copy&utm_campaign=default\n✅ ลิ้งค์เข้ากลุ่ม "Consult Project"\nhttps://line.me/ti/g2/pAp5kK3VR-d0Sb1b7870uQ?utm_source=invitation&utm_medium=link_copy&utm_campaign=default\n\n✅ Facebook..อภิวัฒน์ วงศ์กัณหา \n🔴https://www.facebook.com/profile.php?id=100000984524082\n✅ กลุ่มหัดสร้างเกมแฟลช \n🔴https://www.facebook.com/groups/as3flash\n✅ กลุ่มหัดสร้างสื่อด้วย PowerPoint \n🔴https://www.facebook.com/groups/powerpointgraphic\n✅ กลุ่มหัดสร้างเกมด้วย Construct2 \n🔴https://www.facebook.com/groups/construct2game\n✅ กลุ่มสร้างสื่อ CAI ด้วย  Construct2 \n🔴https://www.facebook.com/groups/1454201051311497\n✅ กลุ่มหัดวาดรูปด้วยคอมพิวเตอร์ \n🔴https://www.facebook.com/groups/1207788526026708',
                      wrap: true,
                      size: "sm",
                      maxLines: 10
                    }
                  ]
                }
              ],
              paddingAll: "3%"
            },
            footer: {
              type: "box",
              layout: "vertical",
              spacing: "sm",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  height: "md",
                  action: {
                    type: "uri",
                    label: "ชมตัวอย่างเลย",
                    uri: "https://www.youtube.com/watch?v=ch1ZQWkdWV0"
                  }
                },
                {
                  type: "spacer",
                  size: "sm"
                }
              ],
              flex: 0
            }
          },
          {
            type: "bubble",
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "image",
                  url:
                    "https://firebasestorage.googleapis.com/v0/b/neno-kspoau.appspot.com/o/personal%2F110132.jpg?alt=media&token=542ec141-b1d5-413d-b9e5-08480180024d",
                  size: "full",
                  aspectMode: "cover",
                  gravity: "top",
                  aspectRatio: "9:16"
                },
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "text",
                          text: "E-book",
                          size: "xl",
                          color: "#ffffff",
                          weight: "bold"
                        },
                        {
                          type: "text",
                          text:
                            "การสร้าง Line Bot ตรวจเช็คตารางเรียน แบบ Step-by-step",
                          size: "md",
                          color: "#ffffff",
                          weight: "bold",
                          wrap: true
                        }
                      ]
                    },
                    {
                      type: "box",
                      layout: "baseline",
                      contents: [
                        {
                          type: "text",
                          text: "1,500 บาท",
                          color: "#ebebeb",
                          size: "sm",
                          flex: 0
                        },
                        {
                          type: "text",
                          text: "1990 บาท",
                          color: "#ffffffcc",
                          decoration: "line-through",
                          gravity: "bottom",
                          flex: 0,
                          size: "sm"
                        }
                      ],
                      spacing: "lg"
                    },
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "filler"
                        },
                        {
                          type: "box",
                          layout: "baseline",
                          contents: [
                            {
                              type: "filler"
                            },
                            {
                              type: "icon",
                              url:
                                "https://scdn.line-apps.com/n/channel_devcenter/img/flexsnapshot/clip/clip14.png"
                            },
                            {
                              type: "text",
                              text: "ดูรายละเอียด",
                              color: "#ffffff",
                              flex: 0,
                              offsetTop: "-2px",
                              action: {
                                type: "uri",
                                label: "action",
                                uri:
                                  "https://shop.line.me/@671btyoe/product/318985777"
                              }
                            },
                            {
                              type: "filler"
                            }
                          ],
                          spacing: "sm"
                        },
                        {
                          type: "filler"
                        }
                      ],
                      borderWidth: "1px",
                      cornerRadius: "4px",
                      spacing: "sm",
                      borderColor: "#ffffff",
                      margin: "xxl",
                      height: "40px"
                    },
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "filler"
                        },
                        {
                          type: "box",
                          layout: "baseline",
                          contents: [
                            {
                              type: "filler"
                            },
                            {
                              type: "text",
                              text: "ทดสอบเล่น BOT แจ้งตารางเรียน",
                              color: "#ffffff",
                              flex: 0,
                              offsetTop: "-2px",
                              action: {
                                type: "uri",
                                label: "action",
                                uri: "https://lin.ee/4PnDOZi3L"
                              }
                            },
                            {
                              type: "filler"
                            }
                          ],
                          spacing: "sm"
                        },
                        {
                          type: "filler"
                        }
                      ],
                      borderWidth: "1px",
                      cornerRadius: "4px",
                      spacing: "sm",
                      borderColor: "#ffffff",
                      height: "40px",
                      margin: "xs"
                    }
                  ],
                  position: "absolute",
                  offsetBottom: "0px",
                  offsetStart: "0px",
                  offsetEnd: "0px",
                  backgroundColor: "#03303Acc",
                  paddingAll: "20px",
                  paddingTop: "18px"
                },
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "SALE",
                      color: "#ffffff",
                      align: "center",
                      size: "xs",
                      offsetTop: "3px"
                    }
                  ],
                  position: "absolute",
                  cornerRadius: "20px",
                  offsetTop: "18px",
                  backgroundColor: "#ff334b",
                  offsetStart: "18px",
                  height: "25px",
                  width: "53px"
                }
              ],
              paddingAll: "0px"
            }
          }
        ]
      };
      break;
    case 5:
      altText = "ขั้นตอนการลงทะเบียน";
      flex = {
        type: "carousel",
        contents: [
          {
            type: "bubble",
            size: "kilo",
            body: {
              type: "box",
              layout: "vertical",
              spacing: "none",
              contents: [
                {
                  type: "image",
                  aspectMode: "cover",
                  url:
                    "https://firebasestorage.googleapis.com/v0/b/neno-ce1a0.appspot.com/o/Screenshot_2020-05-29-10-51-09-051_jp.naver.line.android.jpg?alt=media&token=6d4b6e9d-b959-4af9-877f-adf046d1211e",
                  size: "full",
                  aspectRatio: "1:1.8"
                },
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "box",
                          layout: "vertical",
                          contents: [
                            {
                              type: "text",
                              text: "ขั้นตอนการรับลิงค์เข้าห้องเรียน ZOOM",
                              color: "#000000",
                              size: "xl",
                              weight: "bold",
                              wrap: true,
                              decoration: "underline",
                              align: "center"
                            }
                          ],
                          backgroundColor: "#ffff00",
                          cornerRadius: "10px",
                          paddingAll: "5px"
                        },
                        {
                          type: "text",
                          text:
                            "กดปุ่มเพิ่มเพื่อน\nเพื่อแอดบอต Neno เป็นเพื่อน",
                          size: "lg",
                          color: "#ffffff",
                          weight: "bold",
                          wrap: true,
                          align: "center",
                          gravity: "center"
                        },
                        {
                          type: "filler"
                        }
                      ],
                      spacing: "xxl"
                    },
                    {
                      type: "filler"
                    },
                    {
                      type: "button",
                      action: {
                        type: "uri",
                        label: "เพิ่มเพื่อน",
                        uri: "https://line.me/ti/p/@746uisjy"
                      },
                      style: "primary"
                    },
                    {
                      type: "filler"
                    }
                  ],
                  position: "absolute",
                  offsetBottom: "0px",
                  offsetStart: "0px",
                  offsetEnd: "0px",
                  backgroundColor: "#03303Add",
                  paddingAll: "20px",
                  paddingTop: "18px",
                  height: "60%",
                  cornerRadius: "10px"
                }
              ],
              margin: "none",
              paddingAll: "0px"
            }
          },
          {
            type: "bubble",
            size: "kilo",
            body: {
              type: "box",
              layout: "vertical",
              spacing: "none",
              contents: [
                {
                  type: "image",
                  aspectMode: "cover",
                  url:
                    "https://firebasestorage.googleapis.com/v0/b/neno-ce1a0.appspot.com/o/Screenshot_2020-05-29-08-23-35-355_jp.naver.line.android.jpg?alt=media&token=efb10aa0-01e0-4138-a4ca-e4fd4f2476a3",
                  size: "full",
                  aspectRatio: "1:1.8"
                },
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "text",
                          text:
                            "เมื่อแอดบอต Neno แล้ว\nจะมีข้อความต้อนรับแนะนำการใช้งาน",
                          size: "lg",
                          color: "#ffffff",
                          weight: "bold",
                          wrap: true,
                          align: "center",
                          gravity: "center"
                        }
                      ]
                    }
                  ],
                  position: "absolute",
                  offsetBottom: "0px",
                  offsetStart: "0px",
                  offsetEnd: "0px",
                  backgroundColor: "#03303Add",
                  paddingAll: "20px",
                  paddingTop: "18px",
                  height: "40%",
                  cornerRadius: "10px"
                }
              ],
              margin: "none",
              paddingAll: "0px"
            }
          },
          {
            type: "bubble",
            size: "kilo",
            body: {
              type: "box",
              layout: "vertical",
              spacing: "none",
              contents: [
                {
                  type: "image",
                  aspectMode: "cover",
                  url:
                    "https://firebasestorage.googleapis.com/v0/b/neno-ce1a0.appspot.com/o/Screenshot_2020-05-29-08-26-07-587_jp.naver.line.android.jpg?alt=media&token=53862bcb-360d-4928-b3be-938405e6e5c2",
                  size: "full",
                  aspectRatio: "1:1.8"
                },
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "text",
                          text:
                            "พิมพ์ zoomtoday\nจากนั้นจะมีปุ่มขึ้นมาให้กดลงทะเบียน",
                          size: "lg",
                          color: "#ffffff",
                          weight: "bold",
                          wrap: true,
                          align: "center",
                          gravity: "center",
                          contents: [
                            {
                              type: "span",
                              text: "พิมพ์ "
                            },
                            {
                              type: "span",
                              text: "zoomtoday",
                              color: "#ff0000"
                            },
                            {
                              type: "span",
                              text:
                                "\nจากนั้นบอต Neno จะส่งปุ่มให้กดลงทะเบียนกลับมาให้"
                            },
                            {
                              type: "span",
                              text:
                                "\n\nหากเคยลงทะเบียนไปแล้ว จะได้รับลิงค์ zoom ทันที",
                              size: "md",
                              decoration: "underline",
                              style: "normal",
                              weight: "regular"
                            }
                          ]
                        }
                      ]
                    }
                  ],
                  position: "absolute",
                  offsetBottom: "0px",
                  offsetStart: "0px",
                  offsetEnd: "0px",
                  backgroundColor: "#03303Add",
                  paddingAll: "20px",
                  paddingTop: "18px",
                  height: "40%",
                  cornerRadius: "10px"
                }
              ],
              margin: "none",
              paddingAll: "0px"
            }
          },
          {
            type: "bubble",
            size: "kilo",
            body: {
              type: "box",
              layout: "vertical",
              spacing: "none",
              contents: [
                {
                  type: "image",
                  aspectMode: "cover",
                  url:
                    "https://firebasestorage.googleapis.com/v0/b/neno-ce1a0.appspot.com/o/Screenshot_2020-05-29-08-26-34-005_jp.naver.line.android.jpg?alt=media&token=892bb994-d14f-4c5e-86d6-4d5724d12dcd",
                  size: "full",
                  aspectRatio: "1:1.8"
                },
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "text",
                          text:
                            "พิมพ์ zoomtoday\nจากนั้นจะมีปุ่มขึ้นมาให้กดลงทะเบียน",
                          size: "lg",
                          color: "#ffffff",
                          weight: "bold",
                          wrap: true,
                          align: "center",
                          gravity: "center",
                          contents: [
                            {
                              type: "span",
                              text:
                                "เมื่อกดปุ่มลงทะเบียนแล้ว ให้ใส่ข้อมูลให้ครบ\nแล้วกด"
                            },
                            {
                              type: "span",
                              text: "ลงทะเบียน",
                              color: "#ff0000",
                              decoration: "underline"
                            },
                            {
                              type: "span",
                              text:
                                "\nจากนั้นบอต Neno จะส่งปุ่มให้กดลงทะเบียนกลับมาให้"
                            }
                          ]
                        }
                      ]
                    }
                  ],
                  position: "absolute",
                  offsetBottom: "0px",
                  offsetStart: "0px",
                  offsetEnd: "0px",
                  backgroundColor: "#03303Add",
                  paddingAll: "20px",
                  paddingTop: "18px",
                  height: "40%",
                  cornerRadius: "10px"
                }
              ],
              margin: "none",
              paddingAll: "0px"
            }
          },
          {
            type: "bubble",
            size: "kilo",
            body: {
              type: "box",
              layout: "vertical",
              spacing: "none",
              contents: [
                {
                  type: "image",
                  aspectMode: "cover",
                  url:
                    "https://firebasestorage.googleapis.com/v0/b/neno-ce1a0.appspot.com/o/Screenshot_2020-05-29-08-30-15-459_jp.naver.line.android.jpg?alt=media&token=1f931e69-0913-4d93-9421-0a227a33e2be",
                  size: "full",
                  aspectRatio: "1:1.8"
                },
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "text",
                          text:
                            "พิมพ์ zoomtoday\nจากนั้นจะมีปุ่มขึ้นมาให้กดลงทะเบียน",
                          size: "lg",
                          color: "#ffffff",
                          weight: "bold",
                          wrap: true,
                          align: "center",
                          gravity: "center",
                          contents: [
                            {
                              type: "span",
                              text:
                                "หากลงทะเบียนเรียบร้อยจะปรากฏข้อมูลของผู้ลงทะเบียน "
                            },
                            {
                              type: "span",
                              text: "ให้พิม์ "
                            },
                            {
                              type: "span",
                              text: "zoomtoday",
                              color: "#ff0000"
                            },
                            {
                              type: "span",
                              text: " อีกครั้งเพื่อรับลิ้งค์ zoom"
                            }
                          ]
                        }
                      ]
                    }
                  ],
                  position: "absolute",
                  offsetBottom: "0px",
                  offsetStart: "0px",
                  offsetEnd: "0px",
                  backgroundColor: "#03303Add",
                  paddingAll: "20px",
                  paddingTop: "18px",
                  height: "40%",
                  cornerRadius: "10px"
                }
              ],
              margin: "none",
              paddingAll: "0px"
            }
          }
        ]
      };
      break;
    case 6:
      let zoomtime = "";
      let zoomgetlinktime = "";
      let zoomtitle = "";
      while (zoomtitle == "") {
        zoomtitle = prompt("หัวข้อZoom", "");
      }
      while (zoomtime == "") {
        zoomtime = prompt("เวลาสอน", "");
      }
      while (zoomgetlinktime == "") {
        zoomgetlinktime = prompt("เวลารับลิงค์", "");
      }

      let d = new Date();
      altText = "หัวข้อสอนzoom " + d.toLocaleDateString("th-th");
      flex = {
        type: "bubble",
        size: "mega",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "Zoom Today",
              weight: "bold",
              size: "3xl",
              align: "center",
              color: "#ffffff"
            },
            {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text:
                    "หัวข้อสอนวันนี้ " +
                    d.toLocaleDateString("th-th") +
                    " เวลา " +
                    zoomtime,
                  wrap: true
                },
                {
                  type: "text",
                  text: '"' + zoomtitle + '"',
                  wrap: true
                }
              ],
              backgroundColor: "#ffffff",
              cornerRadius: "15px",
              paddingAll: "15px",
              spacing: "xl"
            },
            {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text:
                    "ท่านที่สนใจสามารถเข้าไปพิมพ์ zoomtoday กับบอต neno ได้ตั้งแต่เวลา " +
                    zoomgetlinktime +
                    " เป็นต้นไปครับ",
                  color: "#ffffff",
                  wrap: true
                }
              ]
            }
          ],
          spacing: "lg"
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              action: {
                type: "uri",
                label: "เพิ่มบอต Neno เป็นเพื่อนเลย",
                uri: "https://lin.ee/26LrbMFJR",
                altUri: {
                  desktop: "https://lin.ee/26LrbMFJR"
                }
              },
              height: "sm",
              style: "link"
            }
          ]
        },
        styles: {
          body: {
            backgroundColor: "#2d8cff"
          }
        }
      };
      break;
    case 7:
      flex = {
        type: "bubble",
        size: "mega",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "image",
              url:
                "https://firebasestorage.googleapis.com/v0/b/neno-ce1a0.appspot.com/o/%E0%B8%A3%E0%B8%B92.png?alt=media&token=a3e9f19a-4b68-490b-bc1c-1d70f1c48a36",
              size: "full",
              aspectRatio: "1:1",
              aspectMode: "cover",
              action: {
                type: "uri",
                uri:
                  "https://line.me/ti/g2/UTUAnOvGNEztR9aX5nOv5Q?utm_source=invitation&utm_medium=link_copy&utm_campaign=default"
              }
            },
            {
              type: "button",
              action: {
                type: "uri",
                label: "Click!! ไปที่ห้องใหม่เลย",
                uri:
                  "https://line.me/ti/g2/UTUAnOvGNEztR9aX5nOv5Q?utm_source=invitation&utm_medium=link_copy&utm_campaign=default",
                altUri: {
                  desktop:
                    "https://line.me/ti/g2/UTUAnOvGNEztR9aX5nOv5Q?utm_source=invitation&utm_medium=link_copy&utm_campaign=default"
                }
              },
              style: "primary",
              position: "absolute",
              height: "sm",
              margin: "none",
              offsetTop: "83%",
              offsetStart: "20%"
            }
          ],
          paddingAll: "0px"
        }
      };
      break;
    default:
      break;
  }
  if (!liff.isInClient()) {
    method = "share";
  } else {
    var r = confirm(
      "กด OK ถ้าต้องการส่งข้อความในแชทนี้\n\n\t\t\t\t\t\t\t\tหรือ\n\nกด Cancel ถ้าต้องการแชร์ข้อความไปแชทอื่น"
    );
    if (r == true) {
      method = "send";
    } else {
      method = "share";
    }
  }
  let message = {
    type: "flex",
    altText: altText,
    contents: flex
  };
  if (link != "")
    message.contents.footer = {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "md",
          action: {
            type: "uri",
            label: "LINK",
            uri: link
          }
        },
        {
          type: "spacer",
          size: "sm"
        }
      ],
      flex: 0
    };
  let messages = [];
  messages.push(message);
  if (method == "send") {
    liff.ready.then(() => {
      if (!liff.isLoggedIn()) {
        // set `redirectUri` to redirect the user to a URL other than the front page of your LIFF app.
        liff.login();
      } else {
        liff
          .sendMessages(messages)
          .then(() => {
            liff.closeWindow();
          })
          .catch(err => {
            alert(err);
          });
      }
    });
  } else if (method == "share") {
    liff.ready.then(() => {
      if (!liff.isInClient()) {
        if (!liff.isLoggedIn()) {
          // set `redirectUri` to redirect the user to a URL other than the front page of your LIFF app.
          liff.login();
        } else {
          if (liff.isApiAvailable("shareTargetPicker")) {
            liff.shareTargetPicker([message]);
          }
        }
      } else {
        if (liff.isApiAvailable("shareTargetPicker")) {
          liff.shareTargetPicker([message]);
        }
      }
    });
  }
}
async function getYoutubeData(link) {
  try {
    let options = {
      method: "GET"
    };
    let videoId = YouTubeGetID(link);
    let ytApiKey = "AIzaSyAEcTtyN4hZ_CtGsag4o9SDbRqp3Iyvagc";
    let url =
      "https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=" +
      videoId +
      "&key=" +
      ytApiKey;
    let response = await fetch(url, options);
    let data = await response.json();
    let title = data.items[0].snippet.title;
    let description = data.items[0].snippet.description;
    let thumbnail = data.items[0].snippet.thumbnails.high.url;
    return [thumbnail, title, description];
  } catch (e) {
    return null;
  }
}

function YouTubeGetID(url) {
  var ID = "";
  url = url
    .replace(/(>|<)/gi, "")
    .split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
  if (url[2] !== undefined) {
    ID = url[2].split(/[^0-9a-z_\-]/i);
    ID = ID[0];
  } else {
    ID = url;
  }
  return ID;
}

function dataURLToBlob(dataURL) {
  var BASE64_MARKER = ";base64,";
  if (dataURL.indexOf(BASE64_MARKER) == -1) {
    var parts = dataURL.split(",");
    var contentType = parts[0].split(":")[1];
    var raw = decodeURIComponent(parts[1]);
    return new Blob([raw], { type: contentType });
  }
  var parts = dataURL.split(BASE64_MARKER);
  var contentType = parts[0].split(":")[1];
  var raw = window.atob(parts[1]);
  var rawLength = raw.length;
  var uInt8Array = new Uint8Array(rawLength);
  for (var i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

function getFilename(url) {
  const filename = decodeURIComponent(new URL(url).pathname.split("/").pop());
  if (!filename) return "index.html"; // some default filename
  return filename;
}

function scancode() {
  if (!liff.isInClient()) {
    alert(
      "ฟังก์ชันสแกน Qrcode สามารถใช้ได้ในไลน์เท่านั้น กรุณาเปิด Liff นี้จากไลน์บนสมาร์ทโฟนของท่าน"
    );
  } else {
    liff.scanCode().then(result => {
      // e.g. result = { value: "Hello LIFF app!" }
      prompt("ผลลัพท์: ", result.value);
    });
  }
}

window.shareClick = shareClick;
window.sendClick = sendClick;
window.shared = shared;
