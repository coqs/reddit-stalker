import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import https from "https";

const getGeminiKey = async () => {
  let outout = await fs.promises.readFile("./config.json", "utf8");
  let jsoned = JSON.parse(outout);
  let output = jsoned.gemini_api_key;
  return output;
};

let ai;

// paths
let logs_path = path.join(process.cwd(), "logs");
let output_path = path.join(process.cwd(), "output");
let url_json = `https://www.reddit.com/user/`;
let special_number = Math.floor(Math.random() * 99999999);

// fetchJSON function
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

const getConfig = async () => {
  let path_for_config_file = path.join(process.cwd(), "config.json");
  try {
    let data = await fs.promises.readFile(path_for_config_file, "utf-8");
    let json = JSON.parse(data);
    return [json.username];
  } catch (err) {
    console.log(err);
  }
};

// main reddit fetcher
const MainFunc = async () => {
  try {
    let count = 0;
    const [username] = await getConfig();
    let after = null;

    while (count < 9999999) {
      let url = `${url_json}${username}.json?limit=100${after ? `&after=${after}` : ""}`;
      let data = await fetchJSON(url);

      if (!data.data || !data.data.children.length) {
        console.log("No more data!");
        break;
      }

      for (let item of data.data.children) {
        if (count >= 9999999) break;

        let textToSave = "";
        if (item.kind === "t3") {
          textToSave = `REDDIT POST, UTC CREATION DATE: ${item.data.created_utc}, IS OVER 18: ${item.data.over_18}, FROM AUTHOR/USER: ${item.data.author}, FROM SUBREDDIT: ${item.data.subreddit}, TITLE: ${item.data.title}, SELFTEXT: ${item.data.selftext}\n`;
        } else {
          textToSave = `REDDIT COMMENT, UTC CREATION DATE: ${item.data.created_utc}, IS OVER 18: ${item.data.over_18},  FROM AUTHOR/USER: ${item.data.author}, FROM SUBREDDIT: ${item.data.subreddit}, TEXT: ${item.data.body}\n`;
        }
        if (!fs.existsSync(logs_path)) {
          await fs.promises.mkdir(logs_path, { recursive: true });
        }
        await fs.promises.appendFile(`${logs_path}/${username}.txt`, textToSave);
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
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: textthing,
  });

  return response.text();
};


let gemini_prompt_beggining = `

You are a digital ghost. Your purpose is to silently observe a person's digital trail and reveal the person behind the screen. You don't judge; you just see and connect.
Your Mission:
Read the following logs from a single person's online activity. Each log is a timestamped breadcrumb. Your job is to piece them together to create a detailed profile of who this person is. Be sharp, be insightful, and find the connections others would miss.
How to Read the Logs:
The data will look like this. It's simple.
REDDIT POST, UTC CREATION DATE: [timestamp], ..., FROM SUBREDDIT: [subreddit], TITLE: [title], SELFTEXT: [text]
REDDIT COMMENT, UTC CREATION DATE: [timestamp], ..., FROM SUBREDDIT: [subreddit], TEXT: [text]
The TITLE, SELFTEXT, and TEXT fields are the person's own words. This is where you find their personality.
The UTC CREATION DATE is crucial. Use it to see when they said something.
The FROM SUBREDDIT tells you where they said it. The room they're in tells you a lot about them.
How You Think:
Connect Everything: A comment about their height and another about their favorite band aren't separate facts. They're pieces of the same person. Show how they connect.
Time is a Story: Don't treat everything as if it happened today. Use the UTC CREATION DATE timestamps. If someone said they were 13 two years ago, they're probably 15 now. Show that you understand time has passed.
The Room Reveals the Person: Pay close attention to the FROM SUBREDDIT field. Someone posting in r/teenagers is in a different mindset than someone in r/philosophy. Use this context.
Read Between the Lines: What do their questions reveal? What does their humor say? A post titled "I'm new and bored" is a huge clue—it means they're looking for something.
Find the "Golden Nuggets": Hunt for the truly unique details that make this person them. A weird habit, a specific family story, a strange fear. These are the details that make a profile feel real and a little bit scary.
Your Report Structure:
Present your findings clearly. Keep it concise, but don't miss the juicy details.
// GHOST PROFILE: [User's Name] //
THE PERSON AT A GLANCE
(A quick, sharp summary. Who is this person in a nutshell? What are the most striking things about them?)
THE HARD FACTS (The What)
Physical Clues: Height, gender, or any other physical descriptions.
Identity: Best guess on their current age (use the timestamps to age them up!), location, or nationality.
The People in Their Life: Who do they talk about? Family, friends, relationship status.
THE PERSON INSIDE (The Who & Why)
Vibe & Personality: Are they rebellious, nerdy, insecure, funny? What's their core personality?
Habits & Patterns: Look at the timestamps. When are they online? Do they post in quick bursts? Can you guess their timezone or daily routine?
World of Interests: What are they into? Combine their words with the subreddits they post in. (e.g., "Active in r/teenarazzi and r/teenagers, showing a focus on peer-group social dynamics.")
VULNERABILITIES & PRESSURE POINTS (The "Ooh, Interesting...")
(This is where it gets scary. What makes them tick? What could someone use to get to them?)
The Cracks in the Armor: What are they insecure or naive about?
The Unforgettable Details: What are the 2-3 most unique facts about them that could be used to identify them?
How to Get Their Attention: What topics or feelings could you use to instantly connect with them or push their buttons?
(Now, begin your analysis of the logs provided below.)

`;

const bigFunction = async () => {
  let geminikey = await getGeminiKey();

  // init new gemini client
  ai = new GoogleGenAI({
    apiKey: geminikey,
  });

  const [username] = await getConfig();
  await MainFunc();

  let file_text_path = path.join(process.cwd(), "logs", `${username}.txt`);
  let text_to_feed_gemini = await fs.promises.readFile(file_text_path, "utf-8");

  let text_to_append = await geminiSummaryFunction(
    `${gemini_prompt_beggining}: ${text_to_feed_gemini}`
  );

  let filtered_text = text_to_append.replaceAll("*", "");

  if (!fs.existsSync(output_path)) {
    await fs.promises.mkdir(output_path, { recursive: true });
  }

  await fs.promises.writeFile(`${output_path}/${username}.txt`, filtered_text);

  console.log("DONE! GO CHECK THE OUTPUT FOLDER NOW");
};

await bigFunction();
