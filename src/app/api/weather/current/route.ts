import { NextRequest,NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";

const provinceShort:Record<string,string>={"서울특별시":"서울","부산광역시":"부산","대구광역시":"대구","인천광역시":"인천","광주광역시":"광주","대전광역시":"대전","울산광역시":"울산","세종특별자치시":"세종","경기도":"경기","강원특별자치도":"강원","강원도":"강원","충청북도":"충북","충청남도":"충남","전북특별자치도":"전북","전라북도":"전북","전라남도":"전남","경상북도":"경북","경상남도":"경남","제주특별자치도":"제주"};
type Address={state?:string;province?:string;city?:string;county?:string;borough?:string;district?:string;town?:string;village?:string};
const locationLabel=(address:Address)=>{const province=address.state??address.province??"";const area=address.city??address.county??address.borough??address.district??address.town??address.village??"";const short=provinceShort[province]??province;return [short,area&&area!==province&&area!==short?area:""].filter(Boolean).join(" ")||"현재 위치"};

export async function GET(request:NextRequest){
  const context=await getWorkspaceContextForSession();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});
  const latitude=Number(request.nextUrl.searchParams.get("latitude")),longitude=Number(request.nextUrl.searchParams.get("longitude"));
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude < -90||latitude > 90||longitude < -180||longitude > 180)return NextResponse.json({error:"invalid_coordinates"},{status:400});
  const lat=latitude.toFixed(4),lon=longitude.toFixed(4);
  try{
    const [weatherResponse,locationResponse]=await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,precipitation_probability&timezone=auto`,{headers:{accept:"application/json"},next:{revalidate:600}}),
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1&zoom=10&accept-language=ko`,{headers:{accept:"application/json","user-agent":"InteriorWorkspace/1.0 (weather location display)"},next:{revalidate:86400}}),
    ]);
    if(!weatherResponse.ok)throw new Error("weather_failed");
    const weather=await weatherResponse.json() as {current?:{temperature_2m?:number;weather_code?:number;precipitation_probability?:number}};
    if(typeof weather.current?.temperature_2m!=="number"||typeof weather.current.weather_code!=="number")throw new Error("weather_invalid");
    const location=locationResponse.ok?await locationResponse.json() as {address?:Address}:null;
    return NextResponse.json({temperature:weather.current.temperature_2m,weatherCode:weather.current.weather_code,precipitationProbability:typeof weather.current.precipitation_probability==="number"?weather.current.precipitation_probability:0,location:locationLabel(location?.address??{})},{headers:{"cache-control":"private, max-age=600"}});
  }catch{return NextResponse.json({error:"weather_unavailable"},{status:502})}
}
