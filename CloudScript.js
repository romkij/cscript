handlers.newUserAction = function(args) {
	var SettingsKey = "Settings";
	var CharactersKey = "Characters";	
	
	var titleData = server.GetTitleData({
		Keys : [ SettingsKey ]
	});
	
	var startDragon = JSON.parse(titleData.Data[SettingsKey]).StartDragon;
	
	/* var grantResult = server.GrantItemsToUser({
		PlayFabId: currentPlayerId,
		ItemIds : [ "powerup_magnet", "powerup_shield", "powerup_multiplier" ]
	}); */
	
	var result = server.GrantCharacterToUser({
		PlayFabId : currentPlayerId,
		CharacterName : startDragon.CharacterName,
		CharacterType: startDragon.CharacterType
	});
	
	return result;
}

handlers.grantUserItems = function(args) {
	var itemId = args.itemId;
	var result = server.GrantItemsToUser({
		PlayFabId : currentPlayerId,
		ItemIds : [ itemId ]
	});
	
	return result;
}

function currentTimeInSeconds()
{
    var now = new Date();
    return now.getTime() / 1000;
}

handlers.requestDaily = function (args) {
    var result;
    var oneDay = 86400;

    var requestDateTime = currentTimeInSeconds();
    var completedDays = args.completedDays;

	var playerInternalData = server.GetUserInternalData({
		PlayFabId: currentPlayerId,
		Keys: ["dailyCompletedDays", "dailyNextRequestTime", "dailyDeadlineDateTime"]
	});

    var deadlineDateTime = playerInternalData.Data["dailyDeadlineDateTime"];
	var storedCompletedDays = playerInternalData.Data["dailyCompletedDays"];
    var nextRequestDateTime = playerInternalData.Data["dailyNextRequestDateTime"];

	if (!nextRequestDateTime)
	{
        // First request of daily.
        deadlineDateTime = requestDateTime + oneDay; // request time in seconds + 1 day in seconds.
        nextRequestDateTime = deadlineDateTime + oneDay;
        storedCompletedDays = 0
    }
    else
    {
        deadlineDateTime = parseInt(deadlineDateTime.Value);
        storedCompletedDays = parseInt(storedCompletedDays.Value);
        nextRequestDateTime = parseInt(nextRequestDateTime.Value);

        if (deadlineDateTime <= requestDateTime)
        {
            // Time to check.

            if (nextRequestDateTime > requestDateTime)
            {
                // Good. Client need new level.

                deadlineDateTime = nextRequestDateTime; // request time in seconds + 1 day in seconds.
                nextRequestDateTime = deadlineDateTime + oneDay;
                storedCompletedDays = completedDays;
            }
            else
            {
                // Bad. Too late to cry. Reset daily.

                deadlineDateTime = requestDateTime + oneDay; // request time in seconds + 1 day in seconds.
                nextRequestDateTime = deadlineDateTime + oneDay;
                storedCompletedDays = 0
            }
        }
        else
        {
            // Need to wait end of day for new daily.
            storedCompletedDays = completedDays;
        }
    }

    server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: {
            dailyDeadlineDateTime : String(deadlineDateTime),
            dailyCompletedDays : String(storedCompletedDays),
            dailyNextRequestDateTime : String(nextRequestDateTime)
        }
    });

	return {
        deadline : deadlineDateTime,
        completedDays : storedCompletedDays,
        requestDeadline : nextRequestDateTime
    };
}