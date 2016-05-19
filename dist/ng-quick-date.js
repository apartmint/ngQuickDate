(function() {
  var app;

  // TODO(?): refactor template

  app = angular.module("ngQuickDate", []);

  app.provider("ngQuickDateDefaults", function() {
    return {
      options: {
        dateFormat: 'M/d/yyyy',
        timeFormat: 'h:mm a',
        labelFormat: null,
        placeholder: 'Click to Set Date',
        hoverText: null,
        buttonIconHtml: null,
        closeButtonHtml: '&times;',
        nextLinkHtml: 'Next &rarr;',
        prevLinkHtml: '&larr; Prev',
        disableTimepicker: false,
        disableClearButton: false,
        defaultTime: null,
        language: null,
        dayAbbreviations: ["Su", "M", "Tu", "W", "Th", "F", "Sa"],
        dateFilter: null,
        disableMonthYearSelector: false,
        minYear: null,
        isMobile: null,
        parseDateFunction: function(str) {
          var seconds;
          seconds = Date.parse(str);
          if (isNaN(seconds)) {
            return null;
          } else {
            return new Date(seconds);
          }
        }
      },
      $get: function() {
        return this.options;
      },
      set: function(keyOrHash, value) {
        var k, v, _results;
        if (typeof keyOrHash === 'object') {
          _results = [];
          for (k in keyOrHash) {
            v = keyOrHash[k];
            _results.push(this.options[k] = v);
          }
          return _results;
        } else {
          return this.options[keyOrHash] = value;
        }
      }
    };
  });

  app.directive("quickDatepicker", [
    'ngQuickDateDefaults', '$filter', '$timeout', '$sce', '$window', function(ngQuickDateDefaults, $filter, $timeout, $sce, $window) {
      return {
        restrict: "E",
        require: "?ngModel",
        scope: {
          dateFilter: '=?',
          onChange: "&",
          required: '@'
        },
        replace: true,
        link: function(scope, element, attrs, ngModelCtrl) {
          var dateToString, datepickerClicked, datesAreEqual, datesAreEqualToMinute, debounce, getDaysInMonth, initialize, parseDateString, refreshView, setCalendarDate, setConfigOptions, setInputFieldValues, setupCalendarView, stringToDate;
          initialize = function() {
            var templateDate;
            setConfigOptions();
            scope.toggleCalendar(false);
            scope.weeks = [];
            scope.inputDate = null;
            scope.inputTime = null;
            scope.invalid = true;
            if (typeof attrs.initValue === 'string') {
              ngModelCtrl.$setViewValue(attrs.initValue);
            }
            if (!scope.defaultTime) {
              templateDate = new Date(2013, 0, 1, 12, 0);
              scope.datePlaceholder = $filter('date')(templateDate, scope.dateFormat);
              scope.timePlaceholder = $filter('date')(templateDate, scope.timeFormat);
            }
            setCalendarDate();
            scope.initYearSelector();
            scope.initMonthSelector();
            scope.setMonthSelector();
            scope.setYearSelector();

            // preselect dropdowns once model value is set
            $timeout(function() {
              scope.setMonthSelector();
              scope.setYearSelector();
            }, 1000);
            return refreshView();
          };
          setConfigOptions = function() {
            var key, value;
            for (key in ngQuickDateDefaults) {
              value = ngQuickDateDefaults[key];
              if (key.match(/[Hh]tml/)) {
                scope[key] = $sce.trustAsHtml(ngQuickDateDefaults[key] || "");
              } else if (!scope[key] && attrs[key]) {
                scope[key] = attrs[key];
              } else if (!scope[key]) {
                scope[key] = ngQuickDateDefaults[key];
              }
            }
            if (!scope.labelFormat) {
              scope.labelFormat = scope.dateFormat;
              if (!scope.disableTimepicker) {
                scope.labelFormat += " " + scope.timeFormat;
              }
            }
            if (attrs.iconClass && attrs.iconClass.length) {
              return scope.buttonIconHtml = $sce.trustAsHtml("<i ng-show='iconClass' class='" + attrs.iconClass + "'></i>");
            }
          };
          datepickerClicked = false;
          window.document.addEventListener('click', function(event) {
            if (scope.calendarShown && !datepickerClicked) {
              scope.toggleCalendar(false);
              scope.$apply();
            }
            return datepickerClicked = false;
          });
          angular.element(element[0])[0].addEventListener('click', function(event) {
            return datepickerClicked = true;
          });
          refreshView = function() {
            var date;
            date = ngModelCtrl.$modelValue ? parseDateString(ngModelCtrl.$modelValue) : null;
            setupCalendarView();
            setInputFieldValues(date);
            scope.mainButtonStr = date ? scope.translateDate(null, date) /*$filter('date')(date, scope.labelFormat)*/ : scope.placeholder;
            return scope.invalid = ngModelCtrl.$invalid;
          };
          setInputFieldValues = function(val) {
            if (val != null) {
              scope.inputDate = $filter('date')(val, scope.dateFormat);
              return scope.inputTime = $filter('date')(val, scope.timeFormat);
            } else {
              scope.inputDate = null;
              return scope.inputTime = null;
            }
          };
          setCalendarDate = function(val) {
            var d;
            var currentTime = new Date();
            var year = currentTime.getFullYear();

            if (val == null) {
              val = null;
            }
            d = val != null ? new Date(val) : new Date();
            if (d.toString() === "Invalid Date") {
              d = new Date();
            }
            d.setDate(1);

            return scope.calendarDate = new Date(d);
          };
          setupCalendarView = function() {
            var curDate, d, day, daysInMonth, numRows, offset, row, selected, time, today, weeks, _i, _j, _ref;
            offset = scope.calendarDate.getDay();
            daysInMonth = getDaysInMonth(scope.calendarDate.getFullYear(), scope.calendarDate.getMonth());
            numRows = Math.ceil((offset + daysInMonth) / 7);
            weeks = [];
            curDate = new Date(scope.calendarDate);
            curDate.setDate(curDate.getDate() + (offset * -1));
            for (row = _i = 0, _ref = numRows - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; row = 0 <= _ref ? ++_i : --_i) {
              weeks.push([]);
              for (day = _j = 0; _j <= 6; day = ++_j) {
                d = new Date(curDate);
                if (scope.defaultTime) {
                  time = scope.defaultTime.split(':');
                  d.setHours(time[0] || 0);
                  d.setMinutes(time[1] || 0);
                  d.setSeconds(time[2] || 0);
                }
                selected = ngModelCtrl.$modelValue && d && datesAreEqual(d, ngModelCtrl.$modelValue);
                today = datesAreEqual(d, new Date());
                weeks[row].push({
                  date: d,
                  selected: selected,
                  disabled: typeof scope.dateFilter === 'function' ? !scope.dateFilter(d) : false,
                  other: d.getMonth() !== scope.calendarDate.getMonth(),
                  today: today
                });
                curDate.setDate(curDate.getDate() + 1);
              }
            }
            return scope.weeks = weeks;
          };
          ngModelCtrl.$parsers.push(function(viewVal) {
            if (scope.required && (viewVal == null)) {
              ngModelCtrl.$setValidity('required', false);
              return null;
            } else if (angular.isDate(viewVal)) {
              ngModelCtrl.$setValidity('required', true);
              return viewVal;
            } else if (angular.isString(viewVal)) {
              ngModelCtrl.$setValidity('required', true);
              return scope.parseDateFunction(viewVal);
            } else {
              return null;
            }
          });
          ngModelCtrl.$formatters.push(function(modelVal) {
            if (angular.isDate(modelVal)) {
              return modelVal;
            } else if (angular.isString(modelVal)) {
              return scope.parseDateFunction(modelVal);
            } else {
              return void 0;
            }
          });
          dateToString = function(date, format) {
            return $filter('date')(date, format);
          };
          stringToDate = function(date) {
            if (typeof date === 'string') {
              return parseDateString(date);
            } else {
              return date;
            }
          };
          parseDateString = ngQuickDateDefaults.parseDateFunction;
          datesAreEqual = function(d1, d2, compareTimes) {
            if (compareTimes == null) {
              compareTimes = false;
            }
            if (compareTimes) {
              return (d1 - d2) === 0;
            } else {
              d1 = stringToDate(d1);
              d2 = stringToDate(d2);
              return d1 && d2 && (d1.getYear() === d2.getYear()) && (d1.getMonth() === d2.getMonth()) && (d1.getDate() === d2.getDate());
            }
          };
          datesAreEqualToMinute = function(d1, d2) {
            if (!(d1 && d2)) {
              return false;
            }
            return parseInt(d1.getTime() / 60000) === parseInt(d2.getTime() / 60000);
          };
          getDaysInMonth = function(year, month) {
            return [31, ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
          };
          debounce = function(func, wait) {
            var args, context, later, result, timeout, timestamp;
            timeout = args = context = timestamp = result = null;
            later = function() {
              var last;
              last = +new Date() - timestamp;
              if (last < wait && last > 0) {
                return timeout = setTimeout(later, wait - last);
              } else {
                return timeout = null;
              }
            };
            return function() {
              context = this;
              args = arguments;
              timestamp = +new Date();
              if (!timeout) {
                timeout = setTimeout(later, wait);
                result = func.apply(context, args);
                context = args = null;
              }
              return result;
            };
          };
          ngModelCtrl.$render = function() {
            setCalendarDate(ngModelCtrl.$viewValue);
            return refreshView();
          };
          ngModelCtrl.$viewChangeListeners.unshift(function() {
            setCalendarDate(ngModelCtrl.$viewValue);
            refreshView();
            if (scope.onChange) {
              return scope.onChange();
            }
          });
          scope.$watch('calendarShown', function(newVal, oldVal) {
            var dateInput;
            if (newVal) {
              dateInput = angular.element(element[0].querySelector(".quickdate-date-input"))[0];
              return dateInput.select();
            }
          });
          scope.toggleCalendar = debounce(function(show) {
            if (isFinite(show)) {
              return scope.calendarShown = show;
            } else {
              return scope.calendarShown = !scope.calendarShown;
            }
          }, 150);
          scope.selectDate = function(date, closeCalendar) {
            var changed;
            if (closeCalendar == null) {
              closeCalendar = true;
            }
            changed = (!ngModelCtrl.$viewValue && date) || (ngModelCtrl.$viewValue && !date) || ((date && ngModelCtrl.$viewValue) && (date.getTime() !== ngModelCtrl.$viewValue.getTime()));
            if (typeof scope.dateFilter === 'function' && !scope.dateFilter(date)) {
              return false;
            }
            ngModelCtrl.$setViewValue(date);
            if (closeCalendar) {
              scope.toggleCalendar(false);
            }
            return true;
          };
          scope.selectDateFromInput = function(closeCalendar) {
            var err, tmpDate, tmpDateAndTime, tmpTime;
            if (closeCalendar == null) {
              closeCalendar = false;
            }
            try {
              tmpDate = parseDateString(scope.inputDate);
              if (!tmpDate) {
                throw 'Invalid Date';
              }
              if (!scope.disableTimepicker && scope.inputTime && scope.inputTime.length && tmpDate) {
                tmpTime = scope.disableTimepicker ? '00:00:00' : scope.inputTime;
                tmpDateAndTime = parseDateString("" + scope.inputDate + " " + tmpTime);
                if (!tmpDateAndTime) {
                  throw 'Invalid Time';
                }
                tmpDate = tmpDateAndTime;
              }
              if (!datesAreEqualToMinute(ngModelCtrl.$viewValue, tmpDate)) {
                if (!scope.selectDate(tmpDate, false)) {
                  throw 'Invalid Date';
                }
              }
              if (closeCalendar) {
                scope.toggleCalendar(false);
              }
              scope.inputDateErr = false;
              return scope.inputTimeErr = false;
            } catch (_error) {
              err = _error;
              if (err === 'Invalid Date') {
                return scope.inputDateErr = true;
              } else if (err === 'Invalid Time') {
                return scope.inputTimeErr = true;
              }
            }
          };
          scope.onDateInputTab = function() {
            if (scope.disableTimepicker) {
              scope.toggleCalendar(false);
            }
            return true;
          };
          scope.onTimeInputTab = function() {
            scope.toggleCalendar(false);
            return true;
          };
          scope.nextMonth = function() {
            setCalendarDate(new Date(new Date(scope.calendarDate).setMonth(scope.calendarDate.getMonth() + 1)));
            return refreshView();
          };
          scope.prevMonth = function() {
            setCalendarDate(new Date(new Date(scope.calendarDate).setMonth(scope.calendarDate.getMonth() - 1)));
            return refreshView();
          };
          scope.clear = function() {
            return scope.selectDate(null, true);
          };
          scope.initYearSelector = function() {
            scope.yearArray = [];
            var currentTime = new Date();
            var year = currentTime.getFullYear();

            var numOfYears;
            if (attrs.minYear) numOfYears = Math.abs(attrs.minYear - currentTime.getFullYear());
            else numOfYears = 50;
            for (var i=0; i < numOfYears; i++) {
              scope.yearArray.push({id: i, name: year - i});
            }
          };
          scope.initMonthSelector = function() {
            if (attrs.language === 'zh') {
              scope.monthArray = [{ id: "00", name: "一月" },
                                  { id: "01", name: "二月" },
                                  { id: "02", name: "三月" },
                                  { id: "03", name: "四月" },
                                  { id: "04", name: "五月" },
                                  { id: "05", name: "六月" },
                                  { id: "06", name: "七月" },
                                  { id: "07", name: "八月" },
                                  { id: "08", name: "九月" },
                                  { id: "09", name: "十月" },
                                  { id: "10", name: "十一月" },
                                  { id: "11", name: "十二月" }];
            }
            if (attrs.language === 'es') {
              scope.monthArray = [{ id: "00", name: "Enero" },
                                  { id: "01", name: "Febrero" },
                                  { id: "02", name: "Marzo" },
                                  { id: "03", name: "Abril" },
                                  { id: "04", name: "Mayo" },
                                  { id: "05", name: "Junio" },
                                  { id: "06", name: "Julio" },
                                  { id: "07", name: "Agosto" },
                                  { id: "08", name: "Setiembre" },
                                  { id: "09", name: "Octubre" },
                                  { id: "10", name: "Noviembre" },
                                  { id: "11", name: "Diciembre" }];
            }
            if (attrs.language === 'fr') {
              scope.monthArray = [{ id: "00", name: "Janvier" },
                                  { id: "01", name: "Février" },
                                  { id: "02", name: "Mars" },
                                  { id: "03", name: "Avril" },
                                  { id: "04", name: "Mai" },
                                  { id: "05", name: "Juin" },
                                  { id: "06", name: "Juillet" },
                                  { id: "07", name: "Août" },
                                  { id: "08", name: "Septembre" },
                                  { id: "09", name: "Octobre" },
                                  { id: "10", name: "Novembre" },
                                  { id: "11", name: "Décembre" }];
            }
            if (attrs.language === 'en') {
              scope.monthArray = [{ id: "00", name: "January" },
                                  { id: "01", name: "February" },
                                  { id: "02", name: "March" },
                                  { id: "03", name: "April" },
                                  { id: "04", name: "May" },
                                  { id: "05", name: "June" },
                                  { id: "06", name: "July" },
                                  { id: "07", name: "August" },
                                  { id: "08", name: "September" },
                                  { id: "09", name: "October" },
                                  { id: "10", name: "November" },
                                  { id: "11", name: "December" }];
            }
          };
          scope.setMonthSelector = function() {
            if (ngModelCtrl.$modelValue) scope.monthSelected = new Date(Date.parse(ngModelCtrl.$modelValue)).getUTCMonth();
            else scope.monthSelected = scope.calendarDate.getUTCMonth();
          };
          scope.setYearSelector = function() {
            if (ngModelCtrl.$modelValue) scope.yearSelected = new Date(Date.parse(ngModelCtrl.$modelValue)).getUTCFullYear();
            else scope.yearSelected = scope.calendarDate.getUTCFullYear();
          };
          scope.changeYear = function(yearSelected) {
            var now = new Date();
            var utcNewDate;
            scope.currentYearSelected = yearSelected;
            // check if date.day is already selected
            if (ngModelCtrl.$modelValue === undefined) {
              utcNewDate = new Date(yearSelected, now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
            } else {
              var dateObj = new Date(Date.parse(ngModelCtrl.$modelValue));
              utcNewDate = new Date(yearSelected, dateObj.getUTCMonth(), dateObj.getUTCDate(), dateObj.getUTCHours(), dateObj.getUTCMinutes(), dateObj.getUTCSeconds());
            }
            scope.selectDate(utcNewDate, false);
          };
          scope.changeMonth = function(monthSelected) {
            var now = new Date();
            var utcNewDate;
            scope.currentMonthSelected = monthSelected;
            // check if date.day is already selected
            if (ngModelCtrl.$modelValue === undefined) {
              utcNewDate = new Date(now.getUTCFullYear(), monthSelected, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
            } else {
              var dateObj = new Date(Date.parse(ngModelCtrl.$modelValue));
              utcNewDate = new Date(dateObj.getUTCFullYear(), monthSelected, dateObj.getUTCDate(), dateObj.getUTCHours(), dateObj.getUTCMinutes(), dateObj.getUTCSeconds());
            }
            scope.selectDate(utcNewDate, false);
          };
          scope.mobileScale = function() {
            if ($window.innerWidth < 480) {
              scope.mobileScale = "width: " + $window.innerWidth + "px; position: fixed; top: 50%; left: 50%; -webkit-transform: translate3d(-50%, -52%, 0);-moz-transform: translateX(-50%) translateY(-50%);-ms-transform: translateX(-50%) translateY(-50%);transform: translateX(-50%) translateY(-50%)";
            } else {
              scope.mobileScale = "width: 400px; position: fixed; top: 50%; left: 50%; -webkit-transform: translate3d(-50%, -52%, 0);-moz-transform: translateX(-50%) translateY(-50%);-ms-transform: translateX(-50%) translateY(-50%);transform: translateX(-50%) translateY(-50%)";
            }
          };
          scope.toggleMonthSelector = function() {
            scope.dropDownMonthOpen ? scope.dropDownMonthOpen = false : scope.dropDownMonthOpen = true;
            scope.dropDownYearOpen = false;
          };
          scope.toggleYearSelector = function() {
            scope.dropDownYearOpen ? scope.dropDownYearOpen = false : scope.dropDownYearOpen = true;
            scope.dropDownMonthOpen = false;
          };
          // "invisible" native <select> hack
          scope.applyMobileDropDownHack = function(elemID) {
            $timeout(function() {
              // position <select> before ui-select on mobile
              document.getElementById(elemID + '-selector-mobile').setAttribute("top", document.getElementById(elemID + '-si-mobile').offsetHeight);
              document.getElementById(elemID + '-selector-mobile').setAttribute("left", document.getElementById(elemID + '-si-mobile').offsetWidth);
            }, 10);
          };
          scope.translateDate = function(dateFormat, date) {
            var monthArrayTranslate = [];
            monthArrayTranslate['January'] = { 'en': 'January', 'es': 'Enero', 'zh': '一月', 'fr': 'Janvier' };
            monthArrayTranslate['February'] = { 'en': 'February', 'es': 'Febrero', 'zh': '二月', 'fr': 'Février'};
            monthArrayTranslate['March'] = { 'en': 'March', 'es': 'Marzo', 'zh': '三月', 'fr': 'Mars'};
            monthArrayTranslate['April'] = { 'en': 'April', 'es': 'Abril', 'zh': '四月', 'fr': 'Avril'};
            monthArrayTranslate['May'] = { 'en': 'May', 'es': 'Mayo', 'zh': '五月', 'fr': 'Mai'};
            monthArrayTranslate['June'] = { 'en': 'June', 'es': 'Junio', 'zh': '六月', 'fr': 'Juin'};
            monthArrayTranslate['July'] = { 'en': 'July', 'es': 'Julio', 'zh': '七月', 'fr': 'Juillet'};
            monthArrayTranslate['August'] = { 'en': 'August', 'es': 'Agosto', 'zh': '八月', 'fr': 'Août'};
            monthArrayTranslate['September'] = { 'en': 'September', 'es': 'Setiembre', 'zh': '九月', 'fr': 'Septembre'};
            monthArrayTranslate['October'] = { 'en': 'October', 'es': 'Octubre', 'zh': '十月', 'fr': 'Octobre'};
            monthArrayTranslate['November'] = { 'en': 'November', 'es': 'Noviembre', 'zh': '十一月', 'fr': 'Novembre'};
            monthArrayTranslate['December'] = { 'en': 'December', 'es': 'Diciembre', 'zh': '十二月', 'fr': 'Décembre'};

            if (date)
              return monthArrayTranslate[$filter('date')(date, 'MMMM')][attrs.language] + ' ' + $filter('date')(date, 'd') + ', ' + $filter('date')(date, 'yyyy');
            else
              if (dateFormat === 'MMMM') return monthArrayTranslate[$filter('date')(scope.calendarDate, 'MMMM')][attrs.language];
              else return monthArrayTranslate[$filter('date')(scope.calendarDate, 'MMMM')][attrs.language] + ' ' + $filter('date')(scope.calendarDate, 'yyyy');
          };

          scope.dropDownMonthOpen = false;
          scope.dropDownYearOpen = false;

          // lang source: http://fullcalendar.io/js/fullcalendar-2.7.1/demos/languages.html
          if (attrs.language === 'zh') {
            scope.dayAbbreviations = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
          }
          if (attrs.language === 'es') {
            scope.dayAbbreviations = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
          }
          if (attrs.language === 'fr') {
            scope.dayAbbreviations = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
          }

          if (attrs.isMobile)
            scope.mobileScale();
            scope.applyMobileDropDownHack('qdc-month');
            scope.applyMobileDropDownHack('qdc-year');

          return initialize();
        },
        //'<div class="quickdate-month-selector"><select ng-model="monthSelected" ng-change="changeMonth(monthSelected)"><option ng-repeat="month in monthArray" ng-selected="monthSelected == month.id" value="{{month.id}}">{{month.name}}</option></select></div>\n' +
        //'<div class="quickdate-year-selector"><select ng-model="yearSelected" ng-change="changeYear(yearSelected)"><option ng-repeat="year in yearArray" ng-selected="yearSelected == year.name" value="{{year.name}}">{{year.name}}</option></select></div>\n' +
        template: "<div class='quickdate'>\n" +
                    "<a href='' ng-focus='toggleCalendar()' ng-click='toggleCalendar()' class='quickdate-button' title='{{hoverText}}'>" +
                    "<div ng-hide='iconClass' ng-bind-html='buttonIconHtml'></div>{{mainButtonStr}}</a>\n" +
                      "<div class='quickdate-mobile-overlay' ng-show='calendarShown' ng-click='toggleCalendar()'></div>" +
                      "<div class='quickdate-popup' ng-class='{open: calendarShown}' style='{{mobileScale}}'>\n" +
                        "<a href='' tabindex='-1' class='quickdate-close' ng-click='toggleCalendar()'>" +
                          "<div ng-bind-html='closeButtonHtml'></div>" +
                        "</a>\n" +
                        "<div class='quickdate-text-inputs'>\n" +
                          "<div class='quickdate-input-wrapper'>\n" +
                            "<label>Date</label>\n" +
                            "<input class='quickdate-date-input' ng-class=\"{'ng-invalid': inputDateErr}\" name='inputDate' type='text' ng-model='inputDate' placeholder='{{ datePlaceholder }}' ng-enter=\"selectDateFromInput(true)\" ng-blur=\"selectDateFromInput(false)\" on-tab='onDateInputTab()' />\n" +
                          "</div>\n" +
                        "<div class='quickdate-input-wrapper' ng-hide='disableTimepicker'>\n" +
                          "<label>Time</label>\n" +
                          "<input class='quickdate-time-input' ng-class=\"{'ng-invalid': inputTimeErr}\" name='inputTime' type='text' ng-model='inputTime' placeholder='{{ timePlaceholder }}' ng-enter=\"selectDateFromInput(true)\" ng-blur=\"selectDateFromInput(false)\" on-tab='onTimeInputTab()'>\n" +
                        "</div>\n" +
                      "</div>\n" +
                      "<div class='quickdate-calendar-header' ng-class=\"{ 'qdc-header-height-fix' : !disableMonthYearSelector }\">\n" +
                        "<a href='' class='quickdate-prev-month quickdate-action-link' ng-if='disableMonthYearSelector' tabindex='-1' ng-click='prevMonth()'>" +
                          "<div ng-bind-html='prevLinkHtml'></div>" +
                        "</a>\n" +
                        "<span ng-if='disableMonthYearSelector' class='quickdate-month'>{{translateDate()}}</span>\n" +
                        "<span ng-if='!disableMonthYearSelector' class='quickdate-month'>" +
                          '<div class="quickdate-month-selector select-overflow">' +
                            '<div ng-show="isMobile" class="selectize-control single">' +
                              '<select id="qdc-month-selector-mobile" class="native-mobile-dropdown" ng-model="monthSelected" ng-change="changeMonth(monthSelected)">' +
                                '<option ng-repeat="month in monthArray" ng-selected="monthSelected == month.id" value="{{month.id}}">{{month.name}}</option>' +
                              '</select>' +
                              '<div class="selectize-input" id="qdc-month-si-mobile">' +
                                '<div class="ui-select-match">' +
                                  '<span class="ng-binding ng-scope" ng-bind="translateDate(\'MMMM\')"></span>' +
                                '</div>' +
                              '</div>' +
                            '</div>' +
                            '<div class="selectize-control single" ng-show="!isMobile" ng-click="toggleMonthSelector()">' +
                              '<div class="selectize-input">' +
                                '<div class="ui-select-match">' +
                                  '<span class="ng-binding ng-scope" ng-bind="translateDate(\'MMMM\')"></span>' +
                                '</div>' +
                              '</div>' +
                              '<div ng-show="dropDownMonthOpen" class="ui-select-choices selectize-dropdown single" repeat="month in monthArray">' +
                                '<div class="ui-select-choices-content selectize-dropdown-content">' +
                                  '<div class="ui-select-choices-row ng-scope" ng-class="{active: month.id === currentMonthSelected}" ng-repeat="month in monthArray" ng-click="changeMonth(month.id)">' +
                                    '<div class="option ui-select-choices-row-inner" data-selectable="">' +
                                      '<span class="ng-binding ng-scope">{{month.name}}</span>' +
                                    '</div>' +
                                  '</div>' +
                                '</div>' +
                              '</div>' +
                            '</div>' +
                          '</div>' +
                          '<div class="quickdate-year-selector select-overflow">' +
                            '<div ng-show="isMobile" class="selectize-control single">' +
                              '<select id="qdc-year-selector-mobile" class="native-mobile-dropdown" ng-model="yearSelected" ng-change="changeYear(yearSelected)">' +
                                '<option ng-repeat="year in yearArray" ng-selected="yearSelected == year.name" value="{{year.name}}">{{year.name}}</option>' +
                              '</select>' +
                              '<div class="selectize-input" id="qdc-year-si-mobile">' +
                                '<div class="ui-select-match">' +
                                  '<span class="ng-binding ng-scope">{{calendarDate | date:\'yyyy\'}}</span>' +
                                '</div>' +
                              '</div>' +
                            '</div>' +
                            '<div class="selectize-control single" ng-show="!isMobile" ng-click="toggleYearSelector()">' +
                              '<div class="selectize-input">' +
                                '<div class="ui-select-match">' +
                                  '<span class="ng-binding ng-scope">{{calendarDate | date:\'yyyy\'}}</span>' +
                                '</div>' +
                              '</div>' +
                              '<div ng-show="dropDownYearOpen" class="ui-select-choices selectize-dropdown single" repeat="year in yearArray">' +
                                '<div class="ui-select-choices-content selectize-dropdown-content">' +
                                  '<div class="ui-select-choices-row ng-scope" ng-class="{active: year.name === currentYearSelected}" ng-repeat="year in yearArray" ng-click="changeYear(year.name)">' +
                                    '<div class="option ui-select-choices-row-inner" data-selectable="">' +
                                      '<span class="ng-binding ng-scope">{{year.name}}</span>' +
                                    '</div>' +
                                  '</div>' +
                                '</div>' +
                              '</div>' +
                            '</div>' +
                          '</div>' +
                        "</span>\n" +
                        "<a href='' ng-if='disableMonthYearSelector' class='quickdate-next-month quickdate-action-link' ng-click='nextMonth()' tabindex='-1' >" +
                          "<div ng-bind-html='nextLinkHtml'></div>" +
                        "</a>\n" +
                      "</div>\n" +
                      "<table class='quickdate-calendar'>\n" +
                        "<thead>\n" +
                          "<tr>\n" +
                            "<th ng-repeat='day in dayAbbreviations'>{{day}}</th>\n" +
                          "</tr>\n" +
                        "</thead>\n" +
                        "<tbody>\n" +
                          "<tr ng-repeat='week in weeks'>\n" +
                            "<td ng-mousedown='selectDate(day.date, true, true);setMonthSelector(true);setYearSelector(true)' ng-click='$event.preventDefault()' ng-class='{\"other-month\": day.other, \"disabled-date\": day.disabled, \"selected\": day.selected, \"is-today\": day.today}' ng-repeat='day in week'>{{day.date | date:'d'}}</td>\n" +
                          "</tr>\n" +
                        "</tbody>\n" +
                      "</table>\n" +
                      "<div class='quickdate-popup-footer'>\n" +
                        "<a href='' class='quickdate-clear' tabindex='-1' ng-hide='disableClearButton' ng-click='clear()'>Clear</a>\n" +
                      "</div>\n" +
                    "</div>\n" +
                  "</div>"
      };
    }
  ]);

  app.directive('ngEnter', function() {
    return function(scope, element, attr) {
      return element.bind('keydown keypress', function(e) {
        if (e.which === 13) {
          scope.$apply(attr.ngEnter);
          return e.preventDefault();
        }
      });
    };
  });

  app.directive('onTab', function() {
    return {
      restrict: 'A',
      link: function(scope, element, attr) {
        return element.bind('keydown keypress', function(e) {
          if ((e.which === 9) && !e.shiftKey) {
            return scope.$apply(attr.onTab);
          }
        });
      }
    };
  });

}).call(this);
