const fs = require("fs")
const path = require("path")

let logs_path = path.join(__dirname, "logs")
let username;
let message_count_depth;
let url_json = `https://www.reddit.com/user/`
let special_number = Math.floor(Math.random() * 99999999)

const getConfig = async () => {
    let path_for_config_file = path.join(__dirname, "config.json")

    try {
        let data = await fs.promises.readFile(path_for_config_file, 'utf-8')
        let json_formatted_data = await JSON.parse(data)
        let username = json_formatted_data.username
        let message_count_depth = json_formatted_data.message_count_depth

        return [username, message_count_depth]
    } catch (err) {
        console.log(err)
    }
}

const MainFunc = async () => {
  
  try {
    let count = 0;

    const [username, message_count_depth] = await getConfig();

    let last_comment_id;
    let fetch_url = `${url_json}${username}.json?limit=5` 

    let response = await fetch(fetch_url)
    let data_extra = await response.json()
    console.log(data_extra.data.children[0].data.body)
    console.log(fetch_url)

    setInterval( async () => {
        if (count >= message_count_depth || count >= data_extra.data.children.length) {
            console.log(`reached the max count!!!! ${count}`)
            let new_fetch = `${url_json}${username}.json?limit=5&after=${last_comment_id}`
            response = await fetch(new_fetch)
            data_extra = await response.json()

        } else if (count != message_count_depth) {
            console.log(`havent reached the count yet, still at ${count}`)
            if (data_extra.data.children[count].kind === 't3') {
                console.log(`type is a post!!!`)
                console.log(last_comment_id)
                console.log(`${fetch_url}`)
                fs.promises.appendFile(`${__dirname}/logs/${special_number}.txt`, `REDDIT POST TITLE: ${data_extra.data.children[count].data.title}, REDDIT POST SELFTEXT: ${data_extra.data.children[count].data.selftext} \n`)
                last_comment_id = data_extra.data.after;

            } else {
                console.log(`type is a comment!!!`)
                console.log(last_comment_id)
                console.log(`${fetch_url}`)
                fs.promises.appendFile(`${__dirname}/logs/${special_number}.txt`, `REDDIT COMMENT: ${data_extra.data.children[count].data.body}\n`)
                last_comment_id = data_extra.data.after;


            }
            
            count += 1
        }
    }, 650);


  } catch (e) {
    console.log(e)
  } finally {

}
}


MainFunc()
