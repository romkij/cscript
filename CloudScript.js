
handlers.newUserAction = function (args) {
    var SettingsKey = "Settings";
    var titleData = getTitleData(SettingsKey);
    var startDragon = titleData.StartDragon;

    var characters = server.GetAllUsersCharacters({
        PlayFabId: currentPlayerId
    });

    characters = characters.Characters;

    if (characters != null && characters.length > 0) {
        var glun = characters.filter(function (character) {
            return character.CharacterType == startDragon.CharacterType;
        });

        if (glun != null && glun.length > 0) {
            return getHashedResult(glun);
        }
    }
    else {
        var result = server.GrantCharacterToUser({
            PlayFabId: currentPlayerId,
            CharacterName: startDragon.CharacterName,
            CharacterType: startDragon.CharacterType
        });

        return getHashedResult(result);
    }
};

handlers.test = function (args) {
    if (isValid("test", args)) {
        return getHashedResult("valid");
    } else {
        return getHashedResult("spoofing");
    }
};

handlers.grantUserItems = function(args) {
    if (!isValid("grantUserItems", args)) {
        return getHashedResult();
    }

    var data = JSON.parse(args.Data.Payload);
    // log.debug(JSON.parse(data.ItemIds.));

	var result = server.GrantItemsToUser({
		PlayFabId : currentPlayerId,
        ItemIds: data.ItemIds
	});

    return getHashedResult(result.ItemGrantResults);
};

handlers.processDaily = function (args) {
    args = JSON.parse(args);
    var status = isValid("processDaily", args);

    var data = JSON.parse(args.Data.Payload);
    var DailyKey = "Daily";
    var settings = getTitleData(DailyKey);
    var realDate = new Date();
    var requestTimestamp = currentTimeInSeconds();

    var userClientData = {
        WeekId: data.WeekId,
        IsNeedReward: data.IsNeedReward,
        CurrentDay: data.CurrentDay,
        CompletedDays: data.CompletedDays,
        CurrentProgress: data.CurrentProgress,
        IsCheater: data.IsCheater
    };

    var userServerData = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: [DailyKey]
    });

    if (!status)
        userClientData.IsCheater = true;

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
        RealDate: realDate,
        IsCheater: userClientData.IsCheater

    };

    server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: {
            "Daily": JSON.stringify(userServerData),
            "IsCheater": JSON.stringify(userClientData.IsCheater)
        }
    });

    return getHashedResult(result);
};