
const ACTION_DELAY_AFTER_LOGIN = 5000;	// Delay after logging into a character
const ACTION_DELAY = 20000;				// Wait time after !getmail command
const CHAR_SELECT_DELAY = 11000;		// Delay between retrieving the character list and selecting the character in milliseconds

module.exports = function getAllMail(dispatch) {
	
	const command = dispatch.command
	
	let enabled = false,
		playerId = null,
		chars = null,
		charsUsed = [],
		returnToChar = null,
		charSelectTimer = null
			
	dispatch.hook('S_LOGIN', dispatch.majorPatchVersion >= 81 ? 13 : 12, (event) => {
		({playerId} = event);
	});
	
	dispatch.hook('C_SELECT_USER', 'raw', () => {
		if(enabled || returnToChar) {
			return false;
		}
	});
	
	/*dispatch.hook('C_CANCEL_RETURN_TO_LOBBY', 'raw', () => { // who are you?
		if(!enabled && returnToChar) {
			returnToChar = null;
			command.message('Interrupted return to the starting character.'); // wtf only to starting char4??
		}
	});*/
	
	dispatch.hook('C_LOAD_TOPO_FIN', 'raw', () => {
		if(enabled) {
			setTimeout(doGetMail, ACTION_DELAY_AFTER_LOGIN);
		}
	});
	
	dispatch.hook('S_GET_USER_LIST', 15, (event) => {
		if(!charSelectTimer) {
			chars = event.characters;
			
			if(enabled) {
				for(let i = 0; i < chars.length; i++) {
					if(charsUsed.indexOf(chars[i].id) == -1) {
						let charid = chars[i].id;
						
						charSelectTimer = setTimeout(function() {
							dispatch.toServer('C_SELECT_USER', 1, {
								id: charid,
								unk: 0
							});
							charSelectTimer = null;
						}, CHAR_SELECT_DELAY);
						
						console.log(`Next character selected: ${chars[i].name}`);
						break;
					}
				}
			} else if(returnToChar) {
				charSelectTimer = setTimeout(function() {
					dispatch.toServer('C_SELECT_USER', 1, {
						id: returnToChar,
						unk: 0
					});
					charSelectTimer = null;
					returnToChar = null;
				}, CHAR_SELECT_DELAY);
				console.log('Returning to the starting character...');
			}
		}
	});
	
	command.add('getallmail', () => {
		if(!enabled) {
			enabled = true;
			returnToChar = playerId;
			command.message('GetAllMail in process...');
			console.log('GetAllMail in process...');
			doGetMail();
		} else {
			disableGettingMail();
			returnToChar = null;
		}
	});
	
	function doGetMail() {
		command.exec('getmail');
		setTimeout(function() {command.exec('getmail');}, (ACTION_DELAY / 100 * 80));
		command.message('GetMail used.');
		charsUsed.push(playerId);
		
		if(chars.length > charsUsed.length) {
			command.message('Switching characters...');
			setTimeout(returnToLobby, ACTION_DELAY);
		} else {
			disableGettingMail();
			setTimeout(returnToLobby, ACTION_DELAY);
			command.message('Returning to the starting character...');
		}
	}
	
	function returnToLobby() {
		dispatch.toServer('C_RETURN_TO_LOBBY', 1);
	}
	
	function disableGettingMail() {
		enabled = false;
		charsUsed = [];
		command.message('GetAllMail finished...');
		console.log('GetAllMail finished...');
	}
}