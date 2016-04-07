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
    //var userCurrentProgress = args.CurrentProgress;

    var internalData = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: [DailyKey]
    });

    // NextRequestTimestamp , DeadlineTimestamp , currentProgress , CompletedDays, CurrentDay, WeekId

    if (!internalData.Data[DailyKey]) {
        // First Request Daily.
        internalData = {
            WeekId: guid(),
            DeadlineTimestamp: requestTimestamp + timeout,
            NextRequestTimestamp: requestTimestamp + (timeout * 2),
            CompletedDays: 0,
            CurrentDay: 1
        };
    }
    else {

        internalData = JSON.parse(internalData.Data[DailyKey].Value);

        return JSON.stringify(internalData);


        if (requestTimestamp >= internalData.DeadlineTimestamp) {
            // Time to check.

            if (userCompletedDays > internalData.CompletedDays) {
                internalData.CompletedDays = userCompletedDays;
            }

            if (internalData.NextRequestTimestamp > requestTimestamp && internalData.CompletedDays >= internalData.CurrentDay) {
                // Good. Client need new level.

                internalData.DeadlineTimestamp = internalData.NextRequestTimestamp; // request time in seconds + 1 day in seconds.
                internalData.NextRequestTimestamp += timeout;
            }
            else {
                // Bad. Too late to cry. Reset daily.

                internalData.WeekId = guid();
                internalData.DeadlineTimestamp = requestTimestamp + timeout; // request time in seconds + 1 day in seconds.
                internalData.NextRequestTimestamp = internalData.DeadlineTimestamp + timeout;
                internalData.CompletedDays = 0;
            }

            internalData = internalData.CompletedDays + 1;
        }
        else {
            // Need to wait end of day for new daily.. Save current progress.
            internalData.CompletedDays = userCompletedDays;
        }
    }

    var resultData = JSON.stringify(internalData);

    server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: {"Daily": resultData}
    });

    return internalData;
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


    if (!NextRequestTimestamp)
	{
        // First request of daily.
        uniqueWeekId = guid();
        DeadlineTimestamp = requestTimestamp + oneDay; // request time in seconds + 1 day in seconds.
        NextRequestTimestamp = DeadlineTimestamp + oneDay;
        storedCompletedDays = 0;
        CurrentDay = storedCompletedDays + 1;
    }
    else
    {
        uniqueWeekId = uniqueWeekId.Value;
        DeadlineTimestamp = parseInt(DeadlineTimestamp.Value);
        storedCompletedDays = parseInt(storedCompletedDays.Value);
        NextRequestTimestamp = parseInt(NextRequestTimestamp.Value);
        CurrentDay = parseInt(CurrentDay.Value);

        if (requestTimestamp >= DeadlineTimestamp)
        {
            // Time to check.

            if (CompletedDays > storedCompletedDays) {
                storedCompletedDays = CompletedDays;
            }

            if (NextRequestTimestamp > requestTimestamp && storedCompletedDays >= CurrentDay)
            {
                // Good. Client need new level.
                DeadlineTimestamp = NextRequestTimestamp; // request time in seconds + 1 day in seconds.
                NextRequestTimestamp = DeadlineTimestamp + oneDay;
            }
            else
            {
                // Bad. Too late to cry. Reset daily.
                uniqueWeekId = guid();
                DeadlineTimestamp = requestTimestamp + oneDay; // request time in seconds + 1 day in seconds.
                NextRequestTimestamp = DeadlineTimestamp + oneDay;
                storedCompletedDays = 0;
            }

            CurrentDay = storedCompletedDays + 1;
        }
        else
        {
            // Need to wait end of day for new daily..
            storedCompletedDays = CompletedDays;
        }
    }

    server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: {
            dailyDeadlineTimestamp: String(DeadlineTimestamp),
            dailyCompletedDays : String(storedCompletedDays),
            dailyNextRequestTimestamp: String(NextRequestTimestamp),
            dailyCurrentDay: String(CurrentDay),
            dailyWeekId: String(uniqueWeekId)
        }
    });

	return {
        Deadline: DeadlineTimestamp,
        CompletedDays : storedCompletedDays,
        RequestDeadline: NextRequestTimestamp,
        CurrentDay: CurrentDay,
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
