const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const https = require("https");

const configuration = new GoogleGenerativeAI("YOUR_GEMINI_KEY_HERE_BABY")


let logs_path = path.join(__dirname, "logs");
let output_path = path.join(__dirname, "output")
let url_json = `https://www.reddit.com/user/`;
let special_number = Math.floor(Math.random() * 99999999);

//fetching with https libary
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

const getConfig = async () => {
  let path_for_config_file = path.join(__dirname, "config.json");
  try {
    let data = await fs.promises.readFile(path_for_config_file, 'utf-8');
    let json = JSON.parse(data);
    return [json.username, json.message_count_depth];
  } catch (err) {
    console.log(err);
  }
};

const MainFunc = async () => {
  try {
    let count = 0;
    const [username, message_count_depth] = await getConfig();
    let after = null;

    while (count < message_count_depth) {
      let url = `${url_json}${username}.json?limit=100${after ? `&after=${after}` : ''}`;
      let data = await fetchJSON(url);

      if (!data.data || !data.data.children.length) {
        console.log("No more data!");
        break;
      }

      for (let item of data.data.children) {
        if (count >= message_count_depth) break;

        let textToSave = "";
        if (item.kind === "t3") {
          textToSave = `REDDIT POST TITLE: ${item.data.title}, SELFTEXT: ${item.data.selftext}\n`;
        } else {
          textToSave = `REDDIT COMMENT: ${item.data.body}\n`;
        }

        await fs.promises.appendFile(`${logs_path}/${special_number}.txt`, textToSave);
        console.log(`saved item #${count + 1}`);
        count++;
      }

      after = data.data.after;
      if (!after) break;
    }

    console.log("done save bulking msgs now formatting the text with ai");
  } catch (e) {
    console.log(e);
  }
};

const geminiSummaryFunction = async (textthing) => {
  const modelId = "gemini-2.5-flash-preview-05-20";
  const model = configuration.getGenerativeModel({ model: modelId });
  const result = await model.generateContent(textthing);
  const response = await result.response;
  const text = response.text();
  return text;
}

let gemini_prompt_beggining = `

You are a specialized AI assistant designed to profile individuals based on text analysis. Your primary function is to read a large body of text from a single individual and extract all available personal information to create a concise, factual, and well-organized report.
Your Task:
Read the following collection of online posts and comments from a single person and compile a detailed personal information profile.
Instructions and Rules:
Analyze and Synthesize: Do not simply list or quote comments. You must read all the provided text, identify recurring themes and specific data points, and then synthesize this information into coherent summary points. For example, instead of listing ten comments about a band, state "The user is a passionate fan of [Band Name]."
Structured Output: Present the final profile in a clear, categorical list format. Use logical headings based on the data, such as:
Identity and Demographics (Name, Age, Gender, Location, etc.)
Relationships and Social Life
Personality and Views (Political, social, personal beliefs)
Hobbies and Interests
Education/Career
Health/Personal Struggles
Objective Tone: Your tone must be strictly neutral, factual, and objective. Do not pass judgment, make moral assessments, or add personal opinions about the individual or their life. Your role is that of a data reporter.
Strictly Source-Based: Your analysis must be based only on the provided text. Do not make assumptions or infer information that is not explicitly stated or strongly implied. If a piece of information (like a name) is not present, do not invent it; simply omit it from the report.
Focus on Personal Data: Prioritize extracting personal, biographical, and psychographic information. Ignore conversational filler (e.g., "lol," "ikr") unless it reveals a consistent personality trait (e.g., a specific style of humor).
Begin your analysis on the text that's going to be provided below

`

const bigFunction = async () => {
  await MainFunc()
  let file_text_path = path.join(__dirname, "logs", `${special_number}.txt`)
  let text_to_feed_gemini = await fs.promises.readFile(file_text_path, 'utf-8')
  let text_to_append = await geminiSummaryFunction(`${gemini_prompt_beggining}: ${text_to_feed_gemini}`)
  fs.promises.writeFile(`${output_path}/${special_number}.txt`, text_to_append)
}

bigFunction()