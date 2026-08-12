"use client";

import { useEffect,useState } from "react";
import { Cloud,CloudRain,CloudSun,Droplets,MapPin,Sun } from "lucide-react";

type Weather={temperature:number;weatherCode:number;precipitationProbability:number;location:string};
const label=(code:number)=>code===0?"맑음":code<=3?"구름 조금":code===45||code===48?"안개":code<=67?"비":code<=77?"눈":code<=82?"소나기":code<=86?"눈":"뇌우";
const Icon=({code}:{code:number})=>code===0?<Sun/>:code<=3?<CloudSun/>:code<=48?<Cloud/>:<CloudRain/>;

export function CurrentWeather(){
  const [weather,setWeather]=useState<Weather|null>(null),[status,setStatus]=useState("현재 위치 확인 중");
  useEffect(()=>{if(!navigator.geolocation){const timer=window.setTimeout(()=>setStatus("위치 정보를 지원하지 않습니다"),0);return()=>window.clearTimeout(timer)}navigator.geolocation.getCurrentPosition(async(position)=>{try{const {latitude,longitude}=position.coords;const response=await fetch(`/api/weather/current?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}`,{cache:"no-store"});if(!response.ok)throw new Error();const data=await response.json() as Weather;setWeather(data);setStatus("")}catch{setStatus("날씨를 불러오지 못했습니다")}},()=>setStatus("위치 권한을 허용해주세요"),{enableHighAccuracy:false,timeout:10_000,maximumAge:10*60_000})},[]);
  return <aside className="current-weather" aria-live="polite">{weather?<><div className="weather-primary"><Icon code={weather.weatherCode}/><strong>{Math.round(weather.temperature)}°</strong></div><div className="weather-details"><strong>{weather.location}</strong><span>{label(weather.weatherCode)}</span><small><Droplets/>강수확률 {Math.round(weather.precipitationProbability)}%</small></div></>:<><div className="weather-primary"><MapPin/><strong>--°</strong></div><div className="weather-details"><strong>현재 위치</strong><span>{status}</span></div></>}</aside>;
}
