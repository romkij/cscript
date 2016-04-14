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

handlers.processDaily = function (args) {
    var DailyKey = "Daily";

    var settings = getTitleData(DailyKey);

    var realDate = new Date();
    var requestTimestamp = currentTimeInSeconds();

    var userClientData = {
        WeekId: args.WeekId,
        IsNeedReward: args.IsNeedReward,
        CurrentDay: args.CurrentDay,
        CompletedDays: args.CompletedDays,
        CurrentProgress: args.CurrentProgress,
        IsCheater: args.IsCheater
    };

    var userServerData = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: [DailyKey]
    });

    // if (userClientData.IsCheater) {
    //     server.LogEvent({
    //         PlayFabId: currentPlayerId,
    //         EventName: "DailyCheater",
    //         Body: {
    //             "Day": userClientData.CurrentDay,
    //             "Progress": userClientData.CurrentProgress
    //         }
    //     });
    // }

    if (!userServerData.Data.hasOwnProperty(DailyKey) || userClientData.IsCheater) {
        // First Request Daily.
        userServerData = {
            WeekId: guid(),
            CurrentDay: 1,
            CompletedDays: 0,
            CurrentProgress: 0,
            DeadlineTimestamp: requestTimestamp + settings.Timeout,
            NextRequestTimestamp: requestTimestamp + (settings.Timeout * 2)
        };
    }
    else {

        userServerData = JSON.parse(userServerData.Data[DailyKey].Value);

        if (requestTimestamp >= userServerData.DeadlineTimestamp) {

            log.debug("Time to check!!!! ");
            // Time to check.
            if (userServerData.NextRequestTimestamp >= requestTimestamp && userClientData.CompletedDays >= userServerData.CurrentDay) {
                // Good. Client need new level.
                userServerData.DeadlineTimestamp = userServerData.NextRequestTimestamp; // request time in seconds + 1 day in seconds.
                userServerData.NextRequestTimestamp += settings.Timeout;
                userServerData.CurrentProgress = 0;
            }
            else {
                // Bad. Too late to cry. Reset daily.
                userServerData.WeekId = guid();
                userServerData.DeadlineTimestamp = requestTimestamp + settings.Timeout; // request time in seconds + 1 day in seconds.
                userServerData.NextRequestTimestamp = userServerData.DeadlineTimestamp + settings.Timeout;
                userServerData.CompletedDays = 0;
                userServerData.CurrentProgress = 0;
            }

            userServerData.CurrentDay = userServerData.CompletedDays + 1;
        }
        else {
            userServerData.CurrentProgress = userClientData.CurrentProgress;
            userServerData.CompletedDays = userClientData.CompletedDays;

            log.debug("Not time check!!!! ");
        }

    }

    var result = {
        WeekId: userServerData.WeekId,
        CurrentDay: userServerData.CurrentDay,
        CompletedDays: userServerData.CompletedDays,
        CurrentProgress: userServerData.CurrentProgress,
        DeadlineTimestamp: userServerData.DeadlineTimestamp,
        IsNeedReward: false,
        RewardedItems: [],
        RealDate: realDate
    };

    if (userClientData.IsNeedReward) {
        var reward = userClientData.CurrentDay >= settings.MaxDays ? settings.WeekReward : settings.DailyReward;

        server.GrantItemsToUser({
            PlayFabId: currentPlayerId,
            ItemIds: [reward]
        });

        var unlockResult = server.UnlockContainerItem({
            PlayFabId: currentPlayerId,
            ContainerItemId: reward
        });

        userServerData.CompletedDays = userServerData.CurrentDay >= settings.MaxDays ? 0 : userServerData.CompletedDays;

        result.RewardedItems = unlockResult.GrantedItems;
    }

    server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: {
            "Daily": JSON.stringify(userServerData),
            "IsCheater": JSON.stringify(userClientData.IsCheater)
        }
    });

    return result;
};

handlers.getCorrectedStatistics = function (args) {
    var SettingsKey = "Statistics";
    var StatisticsKey = "UserStatistics";

    var settings = getTitleData(SettingsKey);

    var clientStatistics = args.Statistics;

    var serverStatistics = server.GetUserStatistics({
      PlayFabId: currentPlayerId
    }).UserStatistics;

    return settings;

    for (var stat in clientStatistics)
    {
        if (!clientStatistics.hasOwnProperty(stat))
            continue;
        if (serverStatistics.hasOwnProperty(stat))
        {
            var collection = stat.substring(0, 7);

            var statSettings = settings.filter(function (obj) {
                return obj.Name == stat;
            });

            var calculation = statSettings.Info.filter(function (obj) {
                return obj.CollectionType == collection;
            });

            var serverValue = serverStatistics[stat];
            var clientValue = clientStatistics[stat];

            switch (calculation)
            {
                case "Sum":
                    serverStatistics[stat] += clientValue > serverValue ? clientValue - serverValue : 0;
                    break;
                case "Last":
                    serverStatistics[stat] = clientValue;
                    break;
                case "Maximum":
                    serverStatistics[stat] = clientValue > serverValue ? clientValue : serverValue;
                    break;
                case "Minimum":
                    serverStatistics[stat] = clientValue < serverValue ? clientValue : serverValue;
                    break;
            }
        }
        else
        {
            serverStatistics[stat] = clientStatistics[stat];
        }
    }

    server.UpdateUserStatistics({
        PlayFabId: currentPlayerId,
        UserStatistics: serverStatistics
    });

    return { UserStatistics: serverStatistics };
};

// Additional functionality.
function currentTimeInSeconds() {
    var now = new Date();
    return Math.floor(now.getTime() / 1000);
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