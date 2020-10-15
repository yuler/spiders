require('dotenv').config()
const fs = require('fs')
const path = require('path')
const got = require('got')
const Turndown = require('turndown')
const turndownService = new Turndown()

const output = process.env.OUTPUT
const ua = process.env.USER_AGENT
const cookie = process.env.GEEKBANG_COOKIE
const columnId = process.env.GEEKBANG_COLUMN_ID
const origin = 'https://time.geekbang.org/'

const API_ARTICLES = `serv/v1/column/articles`
const API_ARTICLES_DATA = id => ({
  cid: id,
  order: 'earliest',
  prev: 0,
  sample: false,
  size: 500,
})
const API_ARTICLE = `serv/v1/article`
const API_ARTICLE_DATA = id => ({
  id,
  include_neighbors: true,
  is_freelyread: true
})

const custom = got.extend({
  prefixUrl: origin,
  headers: {
    cookie,
    origin,
    'user-agent': ua,
  },
  hooks: {
    beforeRequest: [
      // TODO: debug log
    ],
  }
})

;(async () => {
  // 1. Fetch articles api
  const articles = new Map()
	try {
    const { body } = await custom.post(API_ARTICLES, {
      json: API_ARTICLES_DATA(columnId),
      responseType: 'json'
    })
    for (let article of body.data.list) {
      articles.set(article.id, article.article_title)
    }
	} catch (error) {
    throw error
  }

  // 2. Traverse aritcles and create file
  for (let [id, title] of articles) {
    custom.post(API_ARTICLE, {
      json: API_ARTICLE_DATA(id),
      responseType: 'json'
    }).then(response => {
      // HTML to markdown
      const markdown = turndownService.turndown(`<h1></h1>\r\n${response.body.data.article_content}`)
      fs.writeFileSync(path.join(output, `${title}.md`), markdown)
    }).catch(error => {
      console.log(error)
    })
    return
  }
})()
