function DoBlur(fld) {
    fld.className = 'textboxes1';
}

function DoFocus(fld) {
    fld.className = 'textboxes3';
}

function DoBlurMultiline(fld) {
    fld.className = 'textboxes1multiline';
}

function DoFocusMultiline(fld) {
    fld.className = 'textboxes3multiline';
}



function isDobDateValid(sender, args) {
    var ctrDay = document.getElementById('ddlday');
    var ctrMonth = document.getElementById('ddlmonth');
    var ctrYear = document.getElementById('ddlyear');
    if (ctrDay.value != "0" && ctrMonth.value != "0" && ctrYear.value != "0") {

        var a = ctrDay.value + "/" + ctrMonth.value + "/" + ctrYear.value;
        if (a.length < 10 || a.length > 10) {
            args.IsValid = false;
            ctrDay.value = "0";
            return;
        }
        var datePat = /^(\d{2})(\/)(\d{2})\2(\d{4})$/;
        var matchArray = a.match(datePat); // is the format ok?
        if (matchArray == null) {
            args.IsValid = false;
            ctrDay.value = "0";
            return;
        }
        day = ctrDay.value; // parse date into variables
        month = ctrMonth.value;
        year = ctrYear.value;
        if (month < 1 || month > 12) { // check month range
            args.IsValid = false;
            ctrDay.value = "0";
            return;
        }
        if (day < 1 || day > 31) {
            args.IsValid = false;
            ctrDay.value = "0";
            return;
        }
        if ((month == 4 || month == 6 || month == 9 || month == 11) && day == 31) {
            args.IsValid = false;
            ctrDay.value = "0";
            return;
        }
        if (month == 2) { // check for february 29th
            var isleap = (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0));
            if (day > 29 || (day == 29 && !isleap)) {
                args.IsValid = false;
                ctrDay.value = "0";
                return;
            }
        }
        args.IsValid = true;  // date is valid
    }
}


function IsValidRollnoCustomVal(sender, args) {
    var flag = true;
    var indx = "0123456789";
    var str = args.Value;
    if (str.length > 0) {
        var len = str.length;
        if (len > 8 || len < 8) {
            flag = false;
        }
        if (str.charAt(0) != '2') {
            flag = false;
        }
        for (i = 0; i < str.length; i++) {
            if (indx.indexOf(str.charAt(i)) < 0) {
                flag = false;
            }
        }
    }
    if (flag == false) {
        args.IsValid = false;
    }
    else {
        args.IsValid = true;
    }
}

function IsDobBlank(sender, args) {
    var ctrDay = document.getElementById('ddlday');
    var ctrMonth = document.getElementById('ddlmonth');
    var ctrYear = document.getElementById('ddlyear');
    if (ctrDay.value == "0" || ctrMonth.value == "0" || ctrYear.value == "0") {
        args.IsValid = false;
        ctrDay.focus();
        return;
    }
}