import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PhoneCall } from 'lucide-react'
import { usePageTitle } from '../lib/title'

const SOURCES: { name: string; url: string; what: string }[] = [
  { name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/copyright', what: 'ბილიკები, გზები, სოფლები და სახელები (© OpenStreetMap-ის მოხალისეები, ODbL ლიცენზია)' },
  { name: 'OpenFreeMap', url: 'https://openfreemap.org', what: 'რუკის ფენები' },
  { name: 'Terrain Tiles (Mapzen / AWS)', url: 'https://registry.opendata.aws/terrain-tiles/', what: 'რელიეფი, 3D მთები და ჰორიზონტალები' },
  { name: 'Esri World Imagery', url: 'https://www.esri.com', what: 'თანამგზავრული ხედი' },
  { name: 'BRouter', url: 'https://brouter.de', what: 'ბილიკის ხაზის აგება გაჩერებებს შორის' },
  { name: 'Wikimedia Commons', url: 'https://commons.wikimedia.org', what: 'ფოტოები თავისუფალი ლიცენზიით (ავტორი ყოველ ფოტოსთან მითითებულია)' },
  { name: 'caucasus-trekking.com', url: 'https://www.caucasus-trekking.com', what: 'მარშრუტების აღწერები და პრაქტიკული ინფორმაცია' },
  { name: 'დაცული ტერიტორიების სააგენტო', url: 'https://apa.gov.ge', what: 'ეროვნული პარკების ბილიკები და წესები' },
  { name: 'Transcaucasian Trail', url: 'https://transcaucasiantrail.org', what: 'ბილიკების აღწერები და რუკები' },
]

export default function AboutPage() {
  usePageTitle('ჩვენ შესახებ')
  return (
    <div className="page max-w-3xl pb-16 pt-10">
      <p className="kicker mb-2 flex items-center gap-2"><span className="blaze" />GreenTrail Georgia</p>
      <h1 className="text-[32px] leading-tight sm:text-[38px]">საქართველოს სალაშქრო ბილიკების რუკა, რომელსაც მოლაშქრეები ავსებენ</h1>
      <p className="mt-4 text-[16.5px] leading-relaxed text-ink-2">
        აქ თავს ვუყრით საქართველოს მარშრუტებს: სირთულეს, დღეებს, გაჩერებებს, საჭირო აღჭურვილობას, საშვებს და საფრთხეებს — და იმას, რასაც ბილიკზე ნამყოფი ადამიანები ყვებიან. მარშრუტების ინფორმაცია საჯარო წყაროებიდან არის შეგროვებული და OpenStreetMap-ის მონაცემებით შემოწმებული, მაგრამ მთაში პირობები სწრაფად იცვლება — წასვლამდე ყოველთვის ადგილზე გადაამოწმე.
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-hard/30 bg-hard/5 p-4">
        <PhoneCall size={20} className="mt-0.5 shrink-0 text-hard" />
        <p className="text-[14.5px] text-ink"><b>გადაუდებელი დახმარება: 112.</b> <span className="text-ink-2">საიტი ადგილობრივ რჩევას და საკუთარ განსჯას ვერ ჩაანაცვლებს. სასაზღვრო ზონებში პასპორტი ან პირადობა თან იქონიე.</span></p>
      </div>

      <Section id="rules" title="საზოგადოების წესები">
        <ul>
          <li><b>პატივისცემა.</b> შეურაცხყოფა, სიძულვილის ენა და პირადი თავდასხმა იშლება.</li>
          <li><b>სპამი და რეკლამა არა.</b> ტურების და მომსახურების რეკლამისთვის არის განყოფილება „გიდები და ტურები“.</li>
          <li><b>მხოლოდ შენი ფოტოები.</b> სხვისი ფოტოს ატვირთვა ავტორის ნებართვის გარეშე არ შეიძლება.</li>
          <li><b>სწორი მარშრუტი.</b> პოსტი იმ მარშრუტზე მონიშნე, რომელიც მართლა გაიარე — ასე ითვლება სტატისტიკა და სხვები ზუსტ ინფორმაციას იღებენ.</li>
          <li><b>პატიოსანი ინფორმაცია უსაფრთხოებაზე.</b> თუ ბილიკი დაზიანებულია, ხიდი ჩამორეცხილია ან თოვლია — დაწერე. არ გააზვიადო და არ დააკნინო საფრთხე.</li>
          <li><b>სხვისი პირადი ინფორმაცია არა.</b> ნუ გამოაქვეყნებ სხვის ტელეფონს, მისამართს ან ფოტოს მისი ნებართვის გარეშე.</li>
        </ul>
        <p>წესების დარღვევისას კონტენტი შეიძლება დაიმალოს, ხოლო განმეორებით დარღვევისას — ანგარიში შეიზღუდოს. ნებისმიერ პოსტს, კომენტარს, რჩევას ან მომხმარებელს შეგიძლია „შეტყობინება“ ღილაკით მოდერატორს აცნობო.</p>
      </Section>

      <Section id="privacy" title="კონფიდენციალურობა">
        <ul>
          <li><b>ელ-ფოსტა</b> მხოლოდ შესასვლელად და პაროლის აღსადგენად გამოიყენება და საჯაროდ არ ჩანს.</li>
          <li><b>პროფილი, პოსტები, ფოტოები, კომენტარები და რჩევები</b> საჯაროა.</li>
          <li><b>პირადი მიმოწერა</b> მხოლოდ მის ორ მონაწილეს ჩანს; მიმოწერის ფოტოები დაცულ საცავშია და დროებითი ბმულით იხსნება.</li>
          <li><b>ფოტოები</b> ატვირთვამდე შენსავე ბრაუზერში მუშავდება და მცირდება — ამ დროს მათგან იშლება მდებარეობის (GPS) და კამერის მონაცემები.</li>
          <li>შენი პოსტების, ფოტოების, კომენტარების და შეტყობინებების წაშლა ნებისმიერ დროს შეგიძლია.</li>
          <li>საიტი რეკლამას და სხვის თვალთვალის სკრიპტებს არ იყენებს.</li>
        </ul>
      </Section>

      <Section id="sources" title="მონაცემები და მადლობა">
        <ul>
          {SOURCES.map((s) => (
            <li key={s.name}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a> — {s.what}</li>
          ))}
        </ul>
        <p>ყველა მარშრუტის გვერდის ბოლოს მითითებულია, საიდან არის აღებული მისი ინფორმაცია.</p>
      </Section>

      <div className="mt-12 flex flex-wrap gap-2">
        <Link to="/routes" className="btn-primary">მარშრუტების ნახვა</Link>
        <Link to="/register" className="btn-secondary">შემოგვიერთდი</Link>
      </div>
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <h2 className="text-[24px]">{title}</h2>
      <div className="prose-gt mt-2 [&_ul]:my-3">{children}</div>
    </section>
  )
}
