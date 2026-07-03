require("dotenv").config();

module.exports = {
  apiKey: process.env.MTALKZ_API_KEY,
  senderId: process.env.MTALKZ_SENDER_ID,
  templateId: process.env.MTALKZ_TEMPLATE_ID,
  entityId: process.env.MTALKZ_ENTITY_ID,
  baseUrl: "https://msgn.mtalkz.com/api",
};
