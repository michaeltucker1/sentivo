import { ipcMain } from "electron";
import axios from "axios";

const AIRTABLE_API_URL = "https://api.airtable.com/v0/app4z3Yvd7oYYZA7R/Feedback";

export const registerFeedbackIpc = () => {
  ipcMain.handle("feedback:send", async (_, { category, userEmail, message }) => {
    try {
      const airtableToken = process.env.AIRTABLE;
      
      if (!airtableToken) {
        throw new Error("Airtable token not configured");
      }

      const response = await axios.post(
        AIRTABLE_API_URL,
        {
          records: [
            {
              fields: {
                Category: category,
                Email: userEmail,
                Message: message,
                "Created At": new Date().toISOString()
              }
            }
          ]
        },
        {
          headers: {
            "Authorization": `Bearer ${airtableToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200) {
        return { success: true };
      } else {
        throw new Error(`Airtable API returned status ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to send feedback to Airtable:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to send feedback"
      );
    }
  });
};
