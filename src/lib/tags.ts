// Route tags (stored in English, shown in Georgian)
export const TAG_LABEL: Record<string, string> = {
  views: 'ხედები',
  forest: 'ტყე',
  family: 'ოჯახური',
  history: 'ისტორია',
  lakes: 'ტბები',
  national_park: 'ეროვნული პარკი',
  camping: 'კარვით',
  villages: 'სოფლები',
  pass: 'უღელტეხილი',
  towers: 'კოშკები',
  huts: 'თავშესაფრები',
  glacier: 'მყინვარი',
  waterfall: 'ჩანჩქერი',
  river_crossing: 'მდინარის გადალახვა',
  border_zone: 'სასაზღვრო ზონა',
  canyon: 'კანიონი',
  peak: 'მწვერვალი',
  public_transport: 'ტრანსპორტით მისადგომი',
  guesthouses: 'საოჯახო სასტუმროები',
  remote: 'მოშორებული',
  wildlife: 'ველური ბუნება',
  flowers: 'ყვავილობა',
  easy_access: 'ადვილად მისადგომი',
  mountaineering: 'ალპინიზმი',
  mineral_springs: 'მინერალური წყაროები',
  volcanic: 'ვულკანური',
  pilgrimage: 'სამლოცველო',
  '4x4': 'ჯიპით',
  city: 'ქალაქში',
  unesco: 'იუნესკოს ძეგლი',
  scrambling: 'კლდეზე ცოცვა',
  legend: 'ლეგენდები',
}

/** Tags offered as quick filters (most useful first). */
export const FILTER_TAGS = ['lakes', 'glacier', 'waterfall', 'pass', 'peak', 'villages', 'towers', 'history', 'forest', 'canyon', 'family', 'guesthouses', 'huts', 'camping', 'public_transport', 'national_park']

export const tagLabel = (t: string) => TAG_LABEL[t] ?? t.replace(/_/g, ' ')

export const ROUTE_TYPE_LABEL: Record<string, string> = {
  one_way: 'ცალმხრივი',
  loop: 'წრიული',
  out_and_back: 'იქით და უკან',
}
