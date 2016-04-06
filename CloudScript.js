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
};

handlers.grantUserItems = function(args) {
	var itemId = args.itemId;
	var result = server.GrantItemsToUser({
		PlayFabId : currentPlayerId,
		ItemIds : [ itemId ]
	});
	
	return result;
};

function currentTimeInSeconds()
{
    var now = new Date();
    return now.getTime() / 1000;
}

handlers.requestDaily = function (args) {
    var result;
    var oneDay = 86400;

    var requestTimestamp = currentTimeInSeconds();
    var completedDays = args.CompletedDays;

	var playerInternalData = server.GetUserInternalData({
		PlayFabId: currentPlayerId,
        Keys: ["dailyCompletedDays", "dailyNextRequestTimestamp", "dailyDeadlineTimestamp", "dailyCurrentDay"]
	});

    var storedCompletedDays = playerInternalData.Data["dailyCompletedDays"];
    var deadlineTimestamp = playerInternalData.Data["dailyDeadlineTimestamp"];
    var nextRequestTimestamp = playerInternalData.Data["dailyNextRequestTimestamp"];
    var currentDay = playerInternalData.Data["dailyCurrentDay"];

    if (!nextRequestTimestamp)
	{
        // First request of daily.
        deadlineTimestamp = requestTimestamp + oneDay; // request time in seconds + 1 day in seconds.
        nextRequestTimestamp = deadlineTimestamp + oneDay;
        storedCompletedDays = 0;
        currentDay = storedCompletedDays + 1;
    }
    else
    {
        deadlineTimestamp = parseInt(deadlineTimestamp.Value);
        storedCompletedDays = parseInt(storedCompletedDays.Value);
        nextRequestTimestamp = parseInt(nextRequestTimestamp.Value);
        currentDay = parseInt(currentDay.Value);

        if (requestTimestamp >= deadlineTimestamp)
        {
            // Time to check.

            if (nextRequestTimestamp > requestTimestamp && completedDays > storedCompletedDays)
            {
                // Good. Client need new level.

                deadlineTimestamp = nextRequestTimestamp; // request time in seconds + 1 day in seconds.
                nextRequestTimestamp = deadlineTimestamp + oneDay;
                storedCompletedDays = completedDays;
            }
            else
            {
                // Bad. Too late to cry. Reset daily.

                deadlineTimestamp = requestTimestamp + oneDay; // request time in seconds + 1 day in seconds.
                nextRequestTimestamp = deadlineTimestamp + oneDay;
                storedCompletedDays = 0;
            }

            currentDay = storedCompletedDays + 1;
        }
        else
        {
            // Need to wait end of day for new daily..
            storedCompletedDays = completedDays;
        }
    }

    server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: {
            dailyDeadlineTimestamp: String(deadlineTimestamp),
            dailyCompletedDays : String(storedCompletedDays),
            dailyNextRequestTimestamp: String(nextRequestTimestamp),
            dailyCurrentDay: String(currentDay)
        }
    });

	return {
        Deadline: deadlineTimestamp,
        CompletedDays : storedCompletedDays,
        RequestDeadline: nextRequestTimestamp,
        CurrentDay: currentDay
    };
};