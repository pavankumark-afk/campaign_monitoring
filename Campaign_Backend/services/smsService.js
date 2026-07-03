const axios = require("axios");
const mtalkzConfig = require("../config/mtalkz");

exports.sendOTPSMS = async (mobile, otp) => {

// DLT REQUIREMENT CHECKLIST:
// 1. Space before the dot: "is ${otp} ."
   
  const content = `Your OTP for login is ${otp} . Do not share it with anyone. - LEADPC`;

  const payload = {
    apikey: mtalkzConfig.apiKey,
    senderid: mtalkzConfig.senderId,
    number: mobile,
    message: content,
    templateid: mtalkzConfig.templateId,
    format: "json",
  };

  try {
    const response = await axios.get("https://msgn.mtalkz.com/api", {
      params: payload,
    });

    if (response.data.status === "OK") {
      console.log("Scrubbing Passed: Message submitted to carrier.");
      return response.data;
    }
  } catch (error) {
    console.error("API Connection Error:", error.message);
  }
};
