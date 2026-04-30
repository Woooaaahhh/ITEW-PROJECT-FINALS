import dns from 'node:dns'

// Set Google DNS servers
dns.setServers(['8.8.8.8', '8.8.4.4'])

const srvRecord = '_mongodb._tcp.project-midterm.fatysru.mongodb.net'

console.log(`Testing SRV record resolution for: ${srvRecord}`)
console.log('Using DNS servers:', dns.getServers())
console.log('')

async function testSrvResolution() {
  try {
    console.log('Resolving SRV record...')
    const addresses = await dns.resolveSrv(srvRecord)
    console.log('✅ SRV record resolved successfully:')
    console.log(JSON.stringify(addresses, null, 2))
    
    // Test TXT record as well (contains additional connection info)
    console.log('\nResolving TXT record...')
    const txtRecords = await dns.resolveTxt(srvRecord.replace('_tcp.', 'txt.'))
    console.log('✅ TXT record resolved successfully:')
    console.log(JSON.stringify(txtRecords, null, 2))
    
  } catch (error) {
    console.error('❌ DNS resolution failed:')
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error errno:', error.errno)
    console.error('Error syscall:', error.syscall)
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Suggestion: The SRV record might not exist or DNS servers cannot resolve it')
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Suggestion: DNS servers are not reachable')
    }
  }
}

async function testRegularResolution() {
  try {
    console.log('\nTesting regular A record resolution for the domain...')
    const addresses = await dns.resolve4('project-midterm.fatysru.mongodb.net')
    console.log('✅ A record resolved successfully:')
    console.log(JSON.stringify(addresses, null, 2))
  } catch (error) {
    console.error('❌ A record resolution failed:')
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
  }
}

// Run tests
testSrvResolution().then(() => {
  return testRegularResolution()
}).then(() => {
  console.log('\n🔍 DNS resolution test completed')
}).catch(console.error)
