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

handlers.newRequestDaily = function (args) {
    var DailyKey = "Daily";
    var timeout = 60; // 86400

    var userCompletedDays = args.CompletedDays;
    var requestTimestamp = currentTimeInSeconds();
    var userCurrentProgress = args.CurrentProgress;

    var internalData = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: [DailyKey]
    });

    // nextRequestTimestamp , deadlineTimestamp , currentProgress , completedDays, currentDay, weekId

    internalData = JSON.parse(internalData.Data[DailyKey]);

    if (!internalData.weekId) {
        // First Request Daily.

        internalData.weekId = guid();
        internalData.deadlineTimestamp = requestTimestamp + timeout;
        internalData.nextRequestTimestamp = internalData.deadlineTimestamp + timeout;
        internalData.completedDays = 0;
        internalData.currentDay = internalData.completedDays + 1;
    }
    else {
        if (requestTimestamp >= internalData.deadlineTimestamp) {
            // Time to check.

            if (userCompletedDays > internalData.completedDays) {
                internalData.completedDays = userCompletedDays;
            }

            if (internalData.nextRequestTimestamp > requestTimestamp && internalData.completedDays >= internalData.currentDay) {
                // Good. Client need new level.

                internalData.deadlineTimestamp = internalData.nextRequestTimestamp; // request time in seconds + 1 day in seconds.
                internalData.nextRequestTimestamp += timeout;
            }
            else {
                // Bad. Too late to cry. Reset daily.

                internalData.weekId = guid();
                internalData.deadlineTimestamp = requestTimestamp + timeout; // request time in seconds + 1 day in seconds.
                internalData.nextRequestTimestamp = internalData.deadlineTimestamp + timeout;
                internalData.completedDays = 0;
            }

            internalData = internalData.completedDays + 1;
        }
        else {
            // Need to wait end of day for new daily.. Save current progress.
            internalData.completedDays = userCompletedDays;
        }
    }

    var resultData = JSON.stringify(internalData);

    server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: resultData
    });

    return resultData;
};

handlers.requestDaily = function (args) {
    var result;
    var oneDay = 80; //86400;

    var requestTimestamp = currentTimeInSeconds();
    var completedDays = args.CompletedDays;

    var playerInternalData = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: ["dailyCompletedDays", "dailyNextRequestTimestamp", "dailyDeadlineTimestamp", "dailyCurrentDay", "dailyWeekId"]
    });

    var storedCompletedDays = playerInternalData.Data["dailyCompletedDays"];
    var deadlineTimestamp = playerInternalData.Data["dailyDeadlineTimestamp"];
    var nextRequestTimestamp = playerInternalData.Data["dailyNextRequestTimestamp"];
    var currentDay = playerInternalData.Data["dailyCurrentDay"];
    var uniqueWeekId = playerInternalData.Data["dailyWeekId"];


    if (!nextRequestTimestamp)
	{
        // First request of daily.
        uniqueWeekId = guid();
        deadlineTimestamp = requestTimestamp + oneDay; // request time in seconds + 1 day in seconds.
        nextRequestTimestamp = deadlineTimestamp + oneDay;
        storedCompletedDays = 0;
        currentDay = storedCompletedDays + 1;
    }
    else
    {
        uniqueWeekId = uniqueWeekId.Value;
        deadlineTimestamp = parseInt(deadlineTimestamp.Value);
        storedCompletedDays = parseInt(storedCompletedDays.Value);
        nextRequestTimestamp = parseInt(nextRequestTimestamp.Value);
        currentDay = parseInt(currentDay.Value);

        if (requestTimestamp >= deadlineTimestamp)
        {
            // Time to check.

            if (completedDays > storedCompletedDays) {
                storedCompletedDays = completedDays;
            }

            if (nextRequestTimestamp > requestTimestamp && storedCompletedDays >= currentDay)
            {
                // Good. Client need new level.
                deadlineTimestamp = nextRequestTimestamp; // request time in seconds + 1 day in seconds.
                nextRequestTimestamp = deadlineTimestamp + oneDay;
            }
            else
            {
                // Bad. Too late to cry. Reset daily.
                uniqueWeekId = guid();
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
            dailyCurrentDay: String(currentDay),
            dailyWeekId: String(uniqueWeekId)
        }
    });

	return {
        Deadline: deadlineTimestamp,
        CompletedDays : storedCompletedDays,
        RequestDeadline: nextRequestTimestamp,
        CurrentDay: currentDay,
        UniqueWeekId: uniqueWeekId
    };
};


// Additional functionality.
function currentTimeInSeconds() {
    var now = new Date();
    return now.getTime() / 1000;
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}
