
function moduleAvailable(name) {
    try {
        require.resolve(name)
        return true
    } catch(e){}
    return false
}

const haveElectron = moduleAvailable('electron')

module.exports = () => {
	return haveElectron
}