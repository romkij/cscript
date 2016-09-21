handlers.newUserAction = function(args) {
    var SettingsKey = "Settings";

    var titleData = getTitleData(SettingsKey);

    var startDragon = titleData.StartDragon;


    var result = server.GrantCharacterToUser({
        PlayFabId: currentPlayerId,
        CharacterName: startDragon.CharacterName,
        CharacterType: startDragon.CharacterType
    });

    return result;
};

handlers.newUserActionn = function (args) {
    var SettingsKey = "Settings";

    var titleData = getTitleData(SettingsKey);

    var startDragon = titleData.StartDragon;

    var characters = server.GetAllUsersCharacters({
        PlayFabId: currentPlayerId
    });

    return characters;

    if (characters != null && characters.length > 0) {
        var glun = characters.filter(function (character) {
            return character.CharacterType == startDragon.CharacterType;
        });

        if (glun != null && glun.length > 0) {
            return glun;
        }
    }
    else {
        var result = server.GrantCharacterToUser({
            PlayFabId: currentPlayerId,
            CharacterName: startDragon.CharacterName,
            CharacterType: startDragon.CharacterType
        });

        return result;
    }
};



handlers.grantUserItems = function(args) {
	var result = server.GrantItemsToUser({
		PlayFabId : currentPlayerId,
		ItemIds : args.ItemIds
	});

	return result.ItemGrantResults;
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

    var rewardItems;

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

            rewardItems = unlockResult.GrantedItems;
        }

        if (requestTimestamp >= userServerData.DeadlineTimestamp) {

            log.debug("Time to check!");
            // Time to check.
            if (userServerData.NextRequestTimestamp >= requestTimestamp && userClientData.CompletedDays >= userServerData.CurrentDay) {
                // Good. Client need new level.
                userServerData.DeadlineTimestamp = userServerData.NextRequestTimestamp; // request time in seconds + 1 day in seconds.
                userServerData.NextRequestTimestamp += settings.Timeout;
                userServerData.CurrentProgress = 0;
                userServerData.CompletedDays = userServerData.CurrentDay >= settings.MaxDays ? 0 : userServerData.CompletedDays;
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

            log.debug("Not time check!");
        }

    }

    var result = {
        WeekId: userServerData.WeekId,
        CurrentDay: userServerData.CurrentDay,
        CompletedDays: userServerData.CompletedDays,
        CurrentProgress: userServerData.CurrentProgress,
        DeadlineTimestamp: userServerData.DeadlineTimestamp,
        IsNeedReward: false,
        RewardedItems: rewardItems,
        RealDate: realDate
    };

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

    var settings = getTitleData(SettingsKey);

    var clientStatistics = args.Statistics;

    var serverStatistics = server.GetUserStatistics({
      PlayFabId: currentPlayerId
    }).UserStatistics;

    for (var statFullName in clientStatistics)
    {
        if (!clientStatistics.hasOwnProperty(statFullName))
            continue;

        var calculation = getCalculationType(statFullName, settings);

        if (calculation === undefined)
            continue;

        if (serverStatistics.hasOwnProperty(statFullName))
        {
            var serverValue = serverStatistics[statFullName];
            var clientValue = clientStatistics[statFullName];

            switch (calculation)
            {
                case "Sum":
                    serverStatistics[statFullName] += clientValue > serverValue ? clientValue - serverValue : 0;
                    break;
                case "Last":
                    serverStatistics[statFullName] = clientValue;
                    break;
                case "Maximum":
                    serverStatistics[statFullName] = clientValue > serverValue ? clientValue : serverValue;
                    break;
                case "Minimum":
                    serverStatistics[statFullName] = clientValue < serverValue ? clientValue : serverValue;
                    break;
            }
        }
        else
        {
            serverStatistics[statFullName] = clientStatistics[statFullName];
        }
    }

    if (!isEmpty(serverStatistics))
    {
        server.UpdateUserStatistics({
            PlayFabId: currentPlayerId,
            UserStatistics: serverStatistics
        });
    }

    return serverStatistics;
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

function isEmpty(obj) {
    return Object.keys(obj).length === 0 && JSON.stringify(obj) === JSON.stringify({});
}


function getCalculationType(fullname, settings)
{
    var statSettings = getSettingsByFullName(fullname, settings);

    if (typeof statSettings != "undefined")
    {
        return getCalculationTypeByFullName(fullname, statSettings.Info);
    }
}

function getSettingsByFullName(fullName, settings) {
    for (var i = 0; i < settings.length; i++)
    {
        var stat = settings[i];

        if (Contains(fullName, stat.Name))
            return stat;
    }
}

function getCalculationTypeByFullName(fullName,  statInfo) {
    for (var i = 0; i < statInfo.length; i++)
    {
        var info = statInfo[i];

        if (Contains(fullName, info.CollectionType))
            return info.CalculateType;
    }
}

function Contains(a, b) {
    return a.indexOf(b) >= 0;
}