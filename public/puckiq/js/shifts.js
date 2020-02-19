function getFilters() {

    var season = $('form.x-wm-filters [name=season]').val();
    // var tier = $('form.x-wm-filters #tier').val();
    var group_by = $('form.x-wm-filters #group_by').val();

    var positions = null;
    if ($('form.x-wm-filters .x-positions').length) {
        positions = $('form.x-wm-filters .x-positions:checkbox:checked').map(function () {
            return $(this).val();
        }).get();
        if (positions.length === 4) {
            positions = 'all';
        } else {
            positions = positions.join('');
        }
    }

    var min_toi = $('form.x-wm-filters #min_toi').val();
    var max_toi = $('form.x-wm-filters #max_toi').val();
    var from_date = $('form.x-wm-filters #from_date').val();
    var to_date = $('form.x-wm-filters #to_date').val();
    var team = $('form.x-wm-filters #team').val();

    var filters = {
        player : $("form.x-wm-filters #player-id").val(),
        season: season,
        // tier: tier,
        positions: positions,
        team: team,
        group_by: group_by,
        min_toi: parseInt(min_toi),
        max_toi: parseInt(max_toi)
    };

    if(isNaN(filters.min_toi)) delete filters.min_toi;
    if(isNaN(filters.max_toi)) delete filters.max_toi;
    if(!filters.positions) delete filters.positions;
    if(!filters.player) delete filters.player;

    if(!season && from_date && to_date) {
        filters.from_date = new Date(parseInt(from_date)).getTime();
        filters.to_date = new Date(parseInt(to_date)).getTime();
    }

    console.log("filters", filters);
    return filters;
}

/*function showModal(){

    let filters = getFilters();
    if(!filters.season && !filters.from_date && !filters.to_date) {
        console.log('defaulting from_date and to_date');
        let today = new Date();
        today.setHours(0, 0, 0, 0);
        $("#dp-to").datepicker("setDate", today);
        $("#to_date").val(today.getTime());
    }

    $('#date-range-modal').modal({});
}*/

function changeQueryString(val) {
    if (history.pushState) {
        var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?' + val;
        window.history.pushState({path: newurl}, '', newurl);
    }
}

function submitForm(initial_load) {

    var filters = getFilters();
    var keys = Object.keys(filters);
    var tmp = [];
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (filters[key] !== null && filters[key] !== '') tmp.push(key + "=" + encodeURIComponent(filters[key]));
    }

    if (!initial_load) {
        var query_string = tmp.join("&");
        changeQueryString(query_string);
        //updateDateRange(filters);
    }

    //loadChart(filters);
    loadDataTable(filters);
}

/*
function updateDateRange(filters) {

    var dateString = function (dt) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if (!_.isDate(dt)) {
            dt = new Date(dt);
        }

        return `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
    };

    var $ctl = $("#show-date-range");

    if (!(filters.from_date && filters.to_date)) {
        $ctl.hide();
        return;
    } else {

        var from_date_str = dateString(filters.from_date);
        var to_date_str = dateString(filters.to_date);
        var content = from_date_str + " " + to_date_str;
        $ctl.find("span").html(content);
        if(!$ctl.is(":visible")){
            $ctl.show();
        }
    }

}
*/

function onPositionsChange() {
    var forwardPosSelected = $('#pos-c:checked, #pos-l:checked, #pos-r:checked').length;
    $('#pos-f').prop('checked', forwardPosSelected == 3);

    var filters = getFilters();
    $('form.x-wm-filters [name=positions]').val(filters.positions);
}

function onForwardChange() {
    var fSelected = $('#pos-f').is(':checked');
    $('#pos-c,#pos-l,#pos-r').prop('checked', fSelected);
    onPositionsChange();
}

$(function() {

    $('#season-input').change(function () {
        var newSeason = $('#season-input').val();
        if (newSeason === '') {
            showModal();
        } else {
            $("#from_date").val('');
            $("#to_date").val('');
            submitForm();
        }
    });

    $(".x-positions").change(onPositionsChange);
    $("#pos-f").change(onForwardChange);
    $(".x-date-range").change(function(e) {
        let $target = $(e.target);
        let val = $target.val();
        if (val) {
            let year = parseInt(val.substr(6, 4));
            let month = parseInt(val.substr(0, 2));
            let day = parseInt(val.substr(3, 2));
            if (year > 0 && month > 0 && day > 0) {
                let dt = new Date(year, month - 1, day);
                $("#" + $target.attr("data-target")).val(dt.getTime());
            }
        }
    });

    $(".x-woodmoney-submit").click(function(){
        submitForm(false);
    });

    setTimeout(function () {
        submitForm(true);
    }, 10);

});

function loadDataTable(filters) {

    console.log(JSON.stringify(filters));
    $.ajax({
        url: "/shifts/data",
        type: 'POST',
        data : JSON.stringify(filters),
        contentType: 'application/json',
        success: function (data) {
            console.log("data", data);

            $("#puckiq").html(renderTable(data.results, filters));

            if(data.results.length === 0){
                $("#table-footer").html("No results");
            } else {
                let filter_str = $.param(filters);
                let href = "";
                if (filters.player) {
                    href += `/players/${filters.player}/download?${filter_str}`;
                } else {
                    href = `/woodmoney/download?${filter_str}`;
                }
                $("#table-footer").html(`<a href="${href}" class="x-download">download csv</a>`);
            }

            if(filters.player){
                console.log("todo update header");
            }

            setTimeout(function(){
                initDatatable(data.request);
            }, 1);
        },
        error: function() {
            //todo
        }
    });

}

function initDatatable(request) {

    var options = {
        //sortInitialOrder  : 'desc',
        widgets: ['zebra', 'columns', 'stickyHeaders'],
        widgetOptions: {
            stickyHeaders_attachTo: null
        }
    };

    var $sort = $("#puckiq thead tr th[data-sort='" + request.sort + "']");
    // if($sort && $sort.length) {
    //     base_sort.push($sort[0].cellIndex);
    //     options.sortList = [[$sort[0].cellIndex, 1]];
    // }

    $("#puckiq").tablesorter(options); //.bind("sortEnd", refreshTableStyles);

    var resort = true;
    var callback = function() {
        //nothing required
    };

    $("#puckiq").trigger("updateAll", [ resort, callback ]);

    if ($sort && $sort.length) {
        let cell_index = $sort[0].cellIndex;
        $("#puckiq tbody tr td:nth-child(" + (cell_index + 1) + ")").addClass("primary");
    }
}

function renderTable(results, filters) {

    var html = `<tbody id="dataTable">`;

    html += renderTableHeader(filters);

    for (var i = 0; i < results.length; i++) {
        html += renderTableRow(results[i], filters);
    }

    html += "</tbody>";

    return html;
}

function renderTableHeader(filters){

    var html = `<thead>
    <tr>`;

    if(!filters.player) {
        html += `<th rowspan="2"  data-sorter="false">Player</th><th rowspan="2" data-sorter="false" >Pos</th>`;
    } else {
        html += `<th rowspan="2"  data-sorter="false">Season</th>`;
    }

    if(!filters.team) {
        html += `<th rowspan="2"  data-sorter="false">Team</th>`;
    }

    html += `<th rowspan="2"  data-sorter="true">Total Shifts</th>`;
    html += `<th colspan="6" data-sorter="false" style="text-align: center;">OStart</th>`;
    html += `<th colspan="6" data-sorter="false" style="text-align: center;">NStart</th>`;
    html += `<th colspan="6" data-sorter="false" style="text-align: center;">DStart</th>`;
    html += `<th colspan="6" data-sorter="false" style="text-align: center;">OTF</th>`;
    html += `<th colspan="6" data-sorter="false" style="text-align: center;">Pure OTF</th>`;
    html += `</tr><tr>`;

    html += `<th data-sort="ostart_shifts">Shifts</th>
        <th data-sort="ostart_gf">GF</th>
        <th data-sort="ostart_ga">GA</th>
        <th data-sort="ostart_cf">CF</th>
        <th data-sort="ostart_ca">CA</th>
        <th data-sort="ostart_avgshift">AVG Shift</th>`;

    html += `<th data-sort="nstart_shifts">Shifts</th>
        <th data-sort="nstart_gf">GF</th>
        <th data-sort="nstart_ga">GA</th>
        <th data-sort="nstart_cf">CF</th>
        <th data-sort="nstart_ca">CA</th>
        <th data-sort="nstart_avgshift">AVG Shift</th>`;

    html += `<th data-sort="dstart_shifts">Shifts</th>
        <th data-sort="dstart_gf">GF</th>
        <th data-sort="dstart_ga">GA</th>
        <th data-sort="dstart_cf">CF</th>
        <th data-sort="dstart_ca">CA</th>
        <th data-sort="dstart_avgshift">AVG Shift</th>`;

    html += `<th data-sort="otf_shifts">Shifts</th>
        <th data-sort="otf_gf">GF</th>
        <th data-sort="otf_ga">GA</th>
        <th data-sort="otf_cf">CF</th>
        <th data-sort="otf_ca">CA</th>
        <th data-sort="otf_avgshift">AVG Shift</th>`;

    html += `<th data-sort="pureotf_shifts">Shifts</th>
        <th data-sort="pureotf_gf">GF</th>
        <th data-sort="pureotf_ga">GA</th>
        <th data-sort="pureotf_cf">CF</th>
        <th data-sort="pureotf_ca">CA</th>
        <th data-sort="pureotf_avgshift">AVG Shift</th>`;

    html += `</tr></thead>`;

    return html;

}

function renderTableRow(playerData, filters) {

    var pd = playerData;

    var html = `<tr>`;

    if(!filters.player) {
        html += `<td style="white-space: nowrap;"><a href="/players/${pd.player_id}">${pd.name}</a></td>
            <td>${pd.position}</td>`;
    } else {
        html += `<td>${pd.season || 'all'}</td>`
    }

    if(!filters.team) {
        if (pd.team) {
            html += `<td><a href="/teams/${pd.team}">${pd.team}</a></td>`;
        } else {
            html += `<td>all</td>`;
        }
    }

    html += `<td>${formatDecimal(pd.total_shifts, 0)}</td>`;

    html += `<td>${formatDecimal(pd.ostart_shifts, 0)}</td>
<td>${formatDecimal(pd.ostart_gf, 0)}</td>
<td>${formatDecimal(pd.ostart_ga, 0)}</td>
<td>${formatDecimal(pd.ostart_cf, 0)}</td>
<td>${formatDecimal(pd.ostart_ca, 0)}</td>
<td>${formatDecimal(pd.ostart_avgshift, 2)}</td>`;

    html += `<td>${formatDecimal(pd.nstart_shifts, 0)}</td>
<td>${formatDecimal(pd.nstart_gf, 0)}</td>
<td>${formatDecimal(pd.nstart_ga, 0)}</td>
<td>${formatDecimal(pd.nstart_cf, 0)}</td>
<td>${formatDecimal(pd.nstart_ca, 0)}</td>
<td>${formatDecimal(pd.nstart_avgshift, 2)}</td>`;

    html += `<td>${formatDecimal(pd.dstart_shifts, 0)}</td>
<td>${formatDecimal(pd.dstart_gf, 0)}</td>
<td>${formatDecimal(pd.dstart_ga, 0)}</td>
<td>${formatDecimal(pd.dstart_cf, 0)}</td>
<td>${formatDecimal(pd.dstart_ca, 0)}</td>
<td>${formatDecimal(pd.dstart_avgshift, 2)}</td>`;

    html += `<td>${formatDecimal(pd.otf_shifts, 0)}</td>
<td>${formatDecimal(pd.otf_gf, 0)}</td>
<td>${formatDecimal(pd.otf_ga, 0)}</td>
<td>${formatDecimal(pd.otf_cf, 0)}</td>
<td>${formatDecimal(pd.otf_ca, 0)}</td>
<td>${formatDecimal(pd.otf_avgshift, 2)}</td>`;

    html += `<td>${formatDecimal(pd.pureotf_shifts, 0)}</td>
<td>${formatDecimal(pd.pureotf_gf, 0)}</td>
<td>${formatDecimal(pd.pureotf_ga, 0)}</td>
<td>${formatDecimal(pd.pureotf_cf, 0)}</td>
<td>${formatDecimal(pd.pureotf_ca, 0)}</td>
<td>${formatDecimal(pd.pureotf_avgshift, 2)}</td>`;

    html += `</tr>`;

    return html;

}