import Redis from 'ioredis'
import Discord from 'discord.js'

const REDIS_URL = process.env.REDIS_URL
const DISCORD_TOKEN = process.env.DISCORD_TOKEN

const SECRET_WORD = 'fnord'
const SECRET_COUNT = 23
const SECRET_ROLE = 'The Illuminati'

let redis = new Redis(REDIS_URL)
let client = new Discord.Client()

client.login(DISCORD_TOKEN)

client.on('ready', () => {
  client.on('message', async message => {

    if (message.author.bot) return
    if (message.type === 'dm') return

    let keyspace = `discordia:guild:${message.guild.id}:user:${message.author.id}`
    let countKey = `${keyspace}:count`
    let confirmedKey = `${keyspace}:confirm`
    let filterKey = `${keyspace}:filter`

    let filterDefined = await redis.exists(filterKey)
    if (!filterDefined) {
      redis.call('BF.RESERVE', filterKey, 0.01, 10000)
    }

    let newMessage = await redis.call('BF.ADD', filterKey, message.content)
    if (!newMessage) return

    let confirmed = await redis.getbit(confirmedKey, 0)
    if (confirmed) return

    let count = message.content
      .split(' ')
      .map(word => word.toLowerCase())
      .filter(word => word === SECRET_WORD)
      .length
    if (!count) return

    let totalCount = await redis.incrby(countKey, count)
    if (totalCount >= SECRET_COUNT) {
      let role = message.guild.roles.cache.find(role => role.name === SECRET_ROLE)
      if (role) {
        message.member.roles.add(role)
        redis.setbit(confirmedKey, 0, 1)
        message.author.send("◬ Illuminati Confirmed ◬")
      }
    }
  })
})
