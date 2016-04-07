handlers.newUserAction = function(args) {
    var SettingsKey = "Settings";

    var titleData = getTitleData(SettingsKey);

    var startDragon = titleData.StartDragon;

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
    var timeout = 180; // 86400

    var settings = getTitleData(DailyKey);

    var requestTimestamp = currentTimeInSeconds();

    var userClientData = {
        WeekId: args.WeekId,
        IsNeedReward: args.IsNeedReward,
        CompletedDays: args.CompletedDays,
        CurrentProgress: args.CurrentProgress
    };

    var userServerData = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: [DailyKey]
    });

    if (!userServerData.Data.hasOwnProperty(DailyKey)) {
        // First Request Daily.
        userServerData = {
            WeekId: guid(),
            CurrentDay: 1,
            CompletedDays: 0,
            CurrentProgress: 0,
            DeadlineTimestamp: requestTimestamp + timeout,
            NextRequestTimestamp: requestTimestamp + (timeout * 2)
        };
    }
    else {

        userServerData = JSON.parse(userServerData.Data[DailyKey].Value);

        if (requestTimestamp >= userServerData.DeadlineTimestamp) {
            // Time to check.
            if (userServerData.NextRequestTimestamp > requestTimestamp && userServerData.CompletedDays >= userServerData.CurrentDay) {
                // Good. Client need new level.
                userServerData.DeadlineTimestamp = userServerData.NextRequestTimestamp; // request time in seconds + 1 day in seconds.
                userServerData.NextRequestTimestamp += timeout;
            }
            else {
                // Bad. Too late to cry. Reset daily.
                userServerData.WeekId = guid();
                userServerData.DeadlineTimestamp = requestTimestamp + timeout; // request time in seconds + 1 day in seconds.
                userServerData.NextRequestTimestamp = userServerData.DeadlineTimestamp + timeout;
                userServerData.CompletedDays = 0;
                userServerData.CurrentProgress = 0;
            }

            userServerData.CurrentDay = userServerData.CompletedDays + 1;
        }
        else {
            userServerData.CurrentProgress = userClientData.CurrentProgress;
            userServerData.CompletedDays = userServerData.CompletedDays >= settings.MaxDays ? 0 : userClientData.CompletedDays;
        }
    }

    var result = {
        WeekId: userServerData.WeekId,
        CurrentDay: userServerData.CurrentDay,
        CompletedDays: userServerData.CompletedDays,
        CurrentProgress: userServerData.CurrentProgress,
        DeadlineTimestamp: userServerData.DeadlineTimestamp,
        IsNeedReward: false,
        RewardedItems: []
    };

    if (userClientData.IsNeedReward) {
        var reward = userClientData.CompletedDays >= settings.MaxDays ? settings.WeekReward : settings.DailyReward;

        var grantResult = server.GrantItemsToUser({
            PlayFabId: currentPlayerId,
            ItemIds: [reward]
        });

        var unlockResult = server.UnlockContainerItem({
            PlayFabId: currentPlayerId,
            ContainerItemId: reward
        });

        result.RewardedItems = unlockResult.GrantedItems;
    }

    server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: {"Daily": JSON.stringify(userServerData)}
    });

    return result;
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

function getTitleData(key) {
    var titleData = server.GetTitleData({
        Keys: [key]
    });

    if (titleData.Data.hasOwnProperty(key))
        return JSON.parse(titleData.Data[key])
}